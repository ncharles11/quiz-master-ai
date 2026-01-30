import { db } from "./db";
import {
  quizzes, results,
  type Quiz, type Result,
  type QuizContent,
  type Question
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createQuiz(originalFilename: string, quizContent: QuizContent): Promise<Quiz>;
  getQuiz(id: number): Promise<Quiz | undefined>;
  getAllQuizzes(): Promise<Quiz[]>;
  createResult(quizId: number, score: number, totalQuestions: number): Promise<Result>;
}

export class DatabaseStorage implements IStorage {
  async createQuiz(originalFilename: string, quizContent: QuizContent): Promise<Quiz> {
    const [quiz] = await db.insert(quizzes).values({
      originalFilename,
      quizContent,
    }).returning();
    return quiz;
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async getAllQuizzes(): Promise<Quiz[]> {
    return await db.select().from(quizzes).orderBy(desc(quizzes.createdAt));
  }

  async createResult(quizId: number, score: number, totalQuestions: number): Promise<Result> {
    const [result] = await db.insert(results).values({
      quizId,
      score,
      totalQuestions,
    }).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
