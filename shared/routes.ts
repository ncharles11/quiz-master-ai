import { z } from "zod";
import { insertQuizSchema, insertResultSchema, submitQuizSchema, quizzes, results } from "./schema";

export const api = {
  quiz: {
    upload: {
      method: "POST" as const,
      path: "/api/quiz/upload",
      // input is FormData, not strictly typed here but handled in route
      responses: {
        201: z.custom<import("./schema").CreateQuizResponse>(),
        400: z.object({ message: z.string() }),
        500: z.object({ message: z.string() }),
      },
    },
    submit: {
      method: "POST" as const,
      path: "/api/quiz/:id/submit",
      input: submitQuizSchema,
      responses: {
        200: z.custom<import("./schema").SubmitQuizResponse>(),
        404: z.object({ message: z.string() }),
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/quizzes",
      responses: {
        200: z.array(z.custom<typeof quizzes.$inferSelect>()),
      },
    }
  },
};
