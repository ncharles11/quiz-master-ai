import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import OpenAI from "openai";
import { quizContentSchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Create quiz from PDF
  app.post("/api/quiz/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API Key not configured" });
      }

      // 1. Extract text from PDF
      let textContent = "";
      try {
        console.log("PDF Upload received:", {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        // Ensure we are passing a Buffer
        const buffer = Buffer.isBuffer(req.file.buffer) 
          ? req.file.buffer 
          : Buffer.from(req.file.buffer);

        const data = await pdf(buffer);
        textContent = data.text;
        
        console.log("Extracted PDF Content (first 500 chars):", textContent.substring(0, 500));
        console.log("Total text length:", textContent.length);
      } catch (error) {
        console.error("PDF Parsing Error:", error);
        return res.status(500).json({ message: "Failed to parse PDF" });
      }

      if (textContent.length < 50) {
        return res.status(400).json({ message: "PDF text is too short to generate a quiz." });
      }

      // 2. Generate Quiz using OpenAI
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const prompt = `
        You are a helpful assistant that generates multiple-choice quizzes from provided text.
        Generate exactly 5 multiple-choice questions based on the text below.
        Return the result as a raw JSON object with the following structure (no markdown formatting):
        {
          "questions": [
            {
              "questionText": "Question text here",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctOptionIndex": 0  // 0-3
            }
          ]
        }
        
        Text Content:
        ${textContent.slice(0, 15000)} // Truncate to avoid token limits if necessary
      `;

      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      const parsedContent = JSON.parse(content);
      const validatedContent = quizContentSchema.parse(parsedContent);

      // 3. Save to DB
      const quiz = await storage.createQuiz(req.file.originalname, validatedContent);

      // 4. Return sanitized quiz (without answers)
      const sanitizedQuestions = validatedContent.questions.map(q => ({
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
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal Server Error" });
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
         return res.status(400).json({ message: "Number of answers does not match number of questions" });
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
