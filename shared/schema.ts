import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  originalFilename: text("original_filename").notNull(),
  quizContent: jsonb("quiz_content").notNull(), // Stores the full JSON from OpenAI (questions + answers)
  createdAt: timestamp("created_at").defaultNow(),
});

export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true });
export const insertResultSchema = createInsertSchema(results).omit({ id: true, createdAt: true });

export type Quiz = typeof quizzes.$inferSelect;
export type Result = typeof results.$inferSelect;

// JSON structure for the quiz content from OpenAI
export const questionSchema = z.object({
  questionText: z.string(),
  options: z.array(z.string()),
  correctOptionIndex: z.number(), // 0-based index
});

export const quizContentSchema = z.object({
  questions: z.array(questionSchema),
});

export type Question = z.infer<typeof questionSchema>;
export type QuizContent = z.infer<typeof quizContentSchema>;

// API Types
export type CreateQuizResponse = {
  id: number;
  originalFilename: string;
  questions: {
    questionText: string;
    options: string[];
  }[];
};

export const submitQuizSchema = z.object({
  answers: z.array(z.number()), // User's selected indices
});

export type SubmitQuizRequest = z.infer<typeof submitQuizSchema>;

export type SubmitQuizResponse = {
  score: number;
  total: number;
  results: {
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
};
