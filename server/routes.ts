import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
// Mock PDF parsing for local development
const mockPdfParse = async (buffer: Buffer) => {
  return {
    text: "This is a sample PDF content for testing purposes. It contains some basic information that can be used to generate quiz questions. The content is intentionally simple to ensure the quiz generation works properly."
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

      // 2. Generate Quiz using Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `Génère 5 questions de quiz à choix multiples au format JSON STRICT. Retourne UNIQUEMENT le JSON sans aucun texte avant ou après. Le format doit être exactement:\n{\n  "questions": [\n    {\n      "questionText": "Question ici",\n      "options": ["Option A", "Option B", "Option C", "Option D"],\n      "correctOptionIndex": 0\n    }\n  ]\n}\n\nTexte à analyser:\n${textContent.slice(0, 15000)}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      if (!content) {
        throw new Error("Empty response from Gemini");
      }

      // Extract JSON from response
      let jsonContent = content;
      
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      } else if (content.includes('```json')) {
        jsonContent = content.replace(/```json\n?|```/g, '').trim();
      } else if (content.includes('```')) {
        jsonContent = content.replace(/```\n?|```/g, '').trim();
      }

      console.log("Gemini raw response:", content);
      console.log("Extracted JSON:", jsonContent);

      const parsedContent = JSON.parse(jsonContent);
      
      // Transform to match expected schema
      const validatedContent = {
        questions: parsedContent.questions || parsedContent.map((q: any) => ({
          questionText: q.titre || q.questionText || q.question,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex || q.bonneReponse || q.correctAnswer
        }))
      };

      // 3. Save to DB
      const quiz = await storage.createQuiz(
        req.file.originalname,
        validatedContent,
      );

      // 4. Return sanitized quiz (without answers)
      const sanitizedQuestions = validatedContent.questions.map((q: any) => ({
        questionText: q.questionText,
        options: q.options,
      }));

      res.status(201).json({
        id: quiz.id,
        originalFilename: quiz.originalFilename,
        questions: sanitizedQuestions,
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
