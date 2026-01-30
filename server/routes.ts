import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
// Mock PDF parsing for local development
const mockPdfParse = async (buffer: Buffer) => {
  // For now, return a sample text to test the system
  // In production, you'd implement real PDF parsing
  return {
    text: "Angular est un framework JavaScript développé par Google pour créer des applications web monopage. Angular utilise TypeScript et offre des fonctionnalités comme le data binding, l'injection de dépendances et les composants réutilisables. La structure d'un projet Angular comprend des modules, des composants, des services et des directives."
  };
};
import { GoogleGenerativeAI } from "@google/generative-ai";
import { quizContentSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Create quiz from PDF
  app.post("/api/quiz/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res
          .status(500)
          .json({ message: "Gemini API Key not configured" });
      }

      
      // 1. Extract text from PDF
      let textContent = "";
      try {
        console.log("PDF Upload received:", {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        });

        // Ensure we are passing a Buffer
        const buffer = Buffer.isBuffer(req.file.buffer)
          ? req.file.buffer
          : Buffer.from(req.file.buffer);

        const data = await mockPdfParse(buffer);
        textContent = data.text;

        console.log(
          "Extracted PDF Content (first 500 chars):",
          textContent.substring(0, 500),
        );
        console.log("Total text length:", textContent.length);
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

      const prompt = `Génère exactement 5 questions basées sur le texte. RÉPONDS UNIQUEMENT AVEC UN TABLEAU JSON PUR. PAS DE TEXTE AVANT OU APRÈS. Format : [ { "question": "...", "options": ["...", "...", "...", "..."], "answer": 0, "explanation": "..." } ]

Texte : ${textContent.slice(0, 15000)}`;

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
