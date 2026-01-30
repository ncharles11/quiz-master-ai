import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type CreateQuizResponse, type SubmitQuizResponse, type SubmitQuizRequest } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Use hardcoded path strings based on the routes_manifest provided in instructions
// since actual api object import might not be fully populated with paths in types

export function useUploadQuiz() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      // We use fetch directly for FormData to avoid Content-Type header issues
      const res = await fetch("/api/quiz/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload PDF");
      }

      return res.json() as Promise<CreateQuizResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "Quiz Generated!",
        description: "Your PDF has been processed successfully.",
      });
      // Navigate to quiz page with the generated data in state/cache
      // Ideally we would store this in a global store or pass via route state,
      // but for now we'll rely on the query cache or local state in the component.
      // Since wouter doesn't support state passing easily, we might just pass the ID
      // and let the component use the returned data if we were persisting it,
      // but here we are returning the questions directly. 
      // We'll handle navigation in the component.
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSubmitQuiz(quizId: number) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (answers: number[]) => {
      const payload: SubmitQuizRequest = { answers };
      // Replace :id in path
      const url = `/api/quiz/${quizId}/submit`;
      const res = await apiRequest("POST", url, payload);
      return res.json() as Promise<SubmitQuizResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      toast({
        title: "Quiz Submitted",
        description: "Checking your results...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useQuizzes() {
  return useQuery({
    queryKey: ["/api/quizzes"],
    queryFn: async () => {
      const res = await fetch("/api/quizzes");
      if (!res.ok) throw new Error("Failed to fetch quizzes");
      return res.json();
    },
  });
}
