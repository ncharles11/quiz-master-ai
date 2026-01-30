import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useSubmitQuiz } from "@/hooks/use-quiz";
import { type CreateQuizResponse } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";

export default function Quiz() {
  const [match, params] = useRoute("/quiz/:id");
  const [, setLocation] = useLocation();
  const quizId = params?.id ? parseInt(params.id) : 0;
  
  const [quizData, setQuizData] = useState<CreateQuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  
  const submitQuiz = useSubmitQuiz(quizId);

  useEffect(() => {
    // Try to retrieve data passed from generation
    const stored = sessionStorage.getItem(`quiz_data_${quizId}`);
    if (stored) {
      setQuizData(JSON.parse(stored));
    } else {
      // If we don't have stored data (e.g. refresh), ideally fetch it
      // For this MVP, we might need to redirect home if we can't refetch inputs
      // Or implement a GET /api/quiz/:id endpoint.
      // Assuming for now user comes from home.
      setLocation("/");
    }
  }, [quizId, setLocation]);

  if (!quizData) return null;

  const allAnswered = quizData.questions.length > 0 && 
    Object.keys(answers).length === quizData.questions.length;

  const handleSubmit = () => {
    // Convert answers object to array based on index
    const answersArray = quizData.questions.map((_, idx) => answers[idx] ?? -1);
    
    submitQuiz.mutate(answersArray, {
      onSuccess: (data) => {
        // Store results and redirect
        sessionStorage.setItem(`quiz_result_${quizId}`, JSON.stringify(data));
        setLocation(`/quiz/${quizId}/results`);
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wider font-bold">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Quiz in progress
          </div>
          <h1 className="text-3xl font-display font-bold">
            {quizData.originalFilename}
          </h1>
          <p className="text-muted-foreground">
            Answer the following questions based on the document content.
          </p>
        </div>

        <div className="space-y-6">
          {quizData.questions.map((q, qIdx) => (
            <motion.div
              key={qIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qIdx * 0.1 }}
              className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                  {qIdx + 1}
                </span>
                <div className="flex-1 space-y-4">
                  <h3 className="text-lg font-medium text-foreground leading-relaxed">
                    {q.questionText}
                  </h3>
                  
                  <div className="space-y-3">
                    {q.options.map((option, oIdx) => (
                      <label
                        key={oIdx}
                        className={`
                          flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                          ${answers[qIdx] === oIdx 
                            ? "border-primary bg-primary/5 shadow-sm" 
                            : "border-transparent bg-gray-50 hover:bg-gray-100"
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name={`question-${qIdx}`}
                          value={oIdx}
                          checked={answers[qIdx] === oIdx}
                          onChange={() => setAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                          className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                        />
                        <span className={`flex-1 ${answers[qIdx] === oIdx ? "font-medium text-primary" : "text-gray-700"}`}>
                          {option}
                        </span>
                        {answers[qIdx] === oIdx && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="sticky bottom-6 flex justify-center pt-4">
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md flex items-center justify-between gap-4">
            <div className="text-sm font-medium text-muted-foreground px-2">
              {Object.keys(answers).length} / {quizData.questions.length} Answered
            </div>
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitQuiz.isPending}
              className={`
                px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2
                transition-all duration-200
                ${!allAnswered 
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                  : "bg-primary text-white hover:bg-primary/90 hover:-translate-y-0.5"
                }
              `}
            >
              {submitQuiz.isPending ? "Submitting..." : "Submit Answers"}
              {!submitQuiz.isPending && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
