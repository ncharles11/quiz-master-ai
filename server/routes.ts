import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import PDFParser from "pdf2json";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { quizContentSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Create quiz from PDF
  app.post("/api/quiz/upload", upload.single("file"), async (req: any, res) => {
    try {
      // Reset variables to prevent cache issues
      let textContent = "";
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res
          .status(500)
          .json({ message: "Gemini API Key not configured" });
      }
      
      // Clear memory cache
      const { mockData } = await import("./db");
      mockData.quizzes.splice(0, mockData.quizzes.length);
      try {
        console.log("PDF Upload received:", {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          bufferLength: req.file.buffer?.length || 0,
        });

        console.log("TAILLE DU BUFFER REÇU:", req.file.buffer.length);

        // Ensure we are passing a fresh Buffer
        const buffer = Buffer.isBuffer(req.file.buffer)
          ? req.file.buffer
          : Buffer.from(req.file.buffer);
          
        console.log("Buffer created, length:", buffer.length);

        // Extract text using pdf2json library
        const pdfParser = new PDFParser(null, true);
        
        await new Promise<void>((resolve, reject) => {
          pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            try {
              const extractedText = pdfParser.getRawTextContent() || "";
              textContent = extractedText;

              console.log("Texte extrait avec succès, longueur:", textContent.length);
              console.log("CONTENU RÉEL DU PDF :", textContent.substring(0, 200));
              console.log("Total text length:", textContent.length);
              
              resolve();
            } catch (error) {
              reject(error);
            }
          });
          
          pdfParser.on("pdfParser_dataError", (errData: any) => {
            console.error("PDF parsing error:", errData.parserError);
            reject(new Error("Failed to parse PDF"));
          });
          
          pdfParser.parseBuffer(req.file.buffer);
        });
      } catch (error) {
        console.error("PDF Parsing Error:", error);
        return res.status(500).json({ message: "Failed to parse PDF" });
      }

      if (textContent.length < 50) {
        return res
          .status(400)
          .json({ message: "PDF text is too short to generate a quiz." });
      }

      console.log("DEBUG TEXTE PDF:", textContent.substring(0, 500));
      console.log("CONTENU RÉEL ENVOYÉ À L'IA:", textContent);
      
      // 2. Generate Quiz using Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `Génère un quiz de 5 questions basé EXCLUSIVEMENT sur ce texte : ${textContent.slice(0, 15000)}. Si le texte parle de Docker, tes questions doivent porter sur Docker (ex: adduser, containers, mariadb). Si le texte parle d'Angular, tes questions doivent porter sur Angular. RÉPONDS UNIQUEMENT AVEC UN TABLEAU JSON PUR. PAS DE TEXTE AVANT OU APRÈS. Format : [ { "question": "...", "options": ["...", "...", "...", "..."], "answer": 0, "explanation": "..." } ]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      if (!content) {
        throw new Error("Empty response from Gemini");
      }

      // Extract JSON from response
      // On cherche l'index du premier '[' et du dernier ']'
      const firstBracket = content.indexOf('[');
      const lastBracket = content.lastIndexOf(']');
      
      if (firstBracket === -1 || lastBracket === -1) {
        throw new Error("Format JSON invalide reçu de l'IA");
      }

      // On ne garde que ce qu'il y a entre les crochets (inclus)
      const cleanJson = content.substring(firstBracket, lastBracket + 1);
      const quizData = JSON.parse(cleanJson);
      
      console.log("RÉPONSE BRUTE GEMINI:", content);
      console.log("Clean JSON:", cleanJson);
      console.log("Parsed content (questions count):", quizData.length);
      
      // Transform to match expected schema
      const validatedContent = {
        questions: quizData.map((q: any) => ({
          questionText: q.question,
          options: q.options,
          correctOptionIndex: q.answer,
          explanation: q.explanation || ""
        }))
      };
      
      console.log("Validated content (questions count):", validatedContent.questions.length);
      console.log("Validated content:", JSON.stringify(validatedContent, null, 2));

      // 3. Save to DB
      const quiz = await storage.createQuiz(
        req.file.originalname,
        validatedContent,
      );

      // 4. Return quiz with answers for frontend validation
      const responseQuestions = validatedContent.questions.map((q: any) => ({
        questionText: q.questionText,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation
      }));
      
      console.log("Response questions count:", responseQuestions.length);
      console.log("Final quiz response:", JSON.stringify({
        id: quiz.id,
        originalFilename: quiz.originalFilename,
        questions: responseQuestions
      }, null, 2));

      res.status(201).json({
        id: quiz.id,
        originalFilename: quiz.originalFilename,
        questions: responseQuestions,
      });
    } catch (error) {
      console.error("Quiz Generation Error:", error);
      res
        .status(500)
        .json({
          message:
            error instanceof Error ? error.message : "Internal Server Error",
        });
    }
  });

  // Submit quiz answers
  app.post(api.quiz.submit.path.replace(":id", ":id"), async (req, res) => {
    try {
      const quizId = parseInt(req.params.id);
      const { answers } = api.quiz.submit.input.parse(req.body);

      const quiz = await storage.getQuiz(quizId);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      // @ts-ignore - DB stores jsonb, but we know the structure
      const questions = quiz.quizContent.questions as any[];

      if (questions.length !== answers.length) {
        return res
          .status(400)
          .json({
            message: "Number of answers does not match number of questions",
          });
      }

      let score = 0;
      const results = questions.map((q, index) => {
        const isCorrect = q.correctOptionIndex === answers[index];
        if (isCorrect) score++;

        return {
          questionText: q.questionText,
          userAnswer: q.options[answers[index]],
          correctAnswer: q.options[q.correctOptionIndex],
          isCorrect,
        };
      });

      await storage.createResult(quizId, score, questions.length);

      res.json({
        score,
        total: questions.length,
        results,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // Get list of quizzes
  app.get(api.quiz.list.path, async (req, res) => {
    const quizzes = await storage.getAllQuizzes();
    res.json(quizzes);
  });

  return httpServer;
}
