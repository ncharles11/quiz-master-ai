import {
  type Quiz, type Result,
  type QuizContent,
  type Question
} from "@shared/schema";
import { mockData } from "./db";

export interface IStorage {
  createQuiz(originalFilename: string, quizContent: QuizContent): Promise<Quiz>;
  getQuiz(id: number): Promise<Quiz | undefined>;
  getAllQuizzes(): Promise<Quiz[]>;
  createResult(quizId: number, score: number, totalQuestions: number): Promise<Result>;
}

export class LocalStorage implements IStorage {
  async createQuiz(originalFilename: string, quizContent: QuizContent): Promise<Quiz> {
    const quiz = {
      id: mockData.nextQuizId,
      originalFilename,
      quizContent,
      createdAt: new Date()
    };
    mockData.quizzes.push(quiz);
    mockData.nextQuizId++;
    return quiz;
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    return mockData.quizzes.find((q: any) => q.id === id);
  }

  async getAllQuizzes(): Promise<Quiz[]> {
    return [...mockData.quizzes].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createResult(quizId: number, score: number, totalQuestions: number): Promise<Result> {
    const result = {
      id: mockData.nextResultId,
      quizId,
      score,
      totalQuestions,
      createdAt: new Date()
    };
    mockData.results.push(result);
    mockData.nextResultId++;
    return result;
  }
}

export const storage = new LocalStorage();
