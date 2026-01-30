import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useSubmitQuiz } from "@/hooks/use-quiz";
import { type CreateQuizResponse } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Quiz() {
  const [match, params] = useRoute("/quiz/:id");
  const [, setLocation] = useLocation();
  const quizId = params?.id ? parseInt(params.id) : 0;
  
  const [quizData, setQuizData] = useState<CreateQuizResponse | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showFeedback, setShowFeedback] = useState<Record<number, boolean>>({});
  const [score, setScore] = useState(0);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const submitQuiz = useSubmitQuiz(quizId);

  useEffect(() => {
    // Try to retrieve data passed from generation
    const stored = sessionStorage.getItem(`quiz_data_${quizId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log("Frontend - Quiz data received:", parsed);
      console.log("Frontend - Questions count:", parsed.questions?.length);
      console.log("Frontend - First question structure:", parsed.questions?.[0]);
      
      // Reset quiz state when new data is loaded
      setQuizData(parsed);
      setAnswers({});
      setShowFeedback({});
      setCurrentQuestionIndex(0);
      setScore(0);
    } else {
      // If we don't have stored data (e.g. refresh), ideally fetch it
      // For this MVP, we might need to redirect home if we can't refetch inputs
      // Or implement a GET /api/quiz/:id endpoint.
      // Assuming for now user comes from home.
      setLocation("/");
    }
  }, [quizId, setLocation]);

  if (!quizData) return null;

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const hasAnswered = answers[currentQuestionIndex] !== undefined;

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

  const progress = (Object.keys(answers).length / quizData.questions.length) * 100;

  const handleAnswerSelect = (qIdx: number, oIdx: number) => {
    console.log('Comparaison:', oIdx, currentQuestion.correctOptionIndex, typeof oIdx, typeof currentQuestion.correctOptionIndex);
    
    setAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
    setShowFeedback(prev => ({ ...prev, [qIdx]: true }));
    
    // Update score if answer is correct
    if (oIdx === currentQuestion.correctOptionIndex) {
      console.log('✅ Bonne réponse! Score +1');
      setScore(prev => prev + 1);
    } else {
      console.log('❌ Mauvaise réponse');
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < quizData!.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const isQuizComplete = currentQuestionIndex === quizData?.questions.length && 
    Object.keys(answers).length === quizData?.questions.length;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Progress Bar */}
        <div className="sticky top-16 bg-white/90 backdrop-blur-md z-10 py-6 border-b border-gray-200 rounded-b-2xl shadow-lg">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-600">Progress</span>
              <span className="font-bold text-primary">{Object.keys(answers).length} / {quizData.questions.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
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
          {isQuizComplete ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="modern-card p-8 text-center"
            >
              <h2 className="text-3xl font-bold mb-4">Quiz Terminé !</h2>
              <p className="text-xl text-primary mb-6">
                Score : {Object.keys(answers).filter((idx, i) => 
                  quizData.questions[i].correctOptionIndex === answers[i]
                ).length} / {quizData.questions.length}
              </p>
              <button
                onClick={handleSubmit}
                disabled={submitQuiz.isPending}
                className="px-8 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
              >
                {submitQuiz.isPending ? "Chargement..." : "Voir les résultats détaillés"}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="modern-card p-6 md:p-8 dark:bg-slate-800 dark:border-slate-700"
            >
              <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                  {currentQuestionIndex + 1}
                </span>
                <div className="flex-1 space-y-4">
                  <h3 className="text-lg font-medium text-foreground leading-relaxed">
                    {currentQuestion.questionText}
                  </h3>
                  
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, oIdx) => (
                      <label
                        key={oIdx}
                        className={`
                          flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                          ${showFeedback[currentQuestionIndex]
                            ? oIdx === currentQuestion.correctOptionIndex
                              ? "border-green-500 bg-green-50"
                              : answers[currentQuestionIndex] === oIdx
                                ? "border-red-500 bg-red-50"
                                : "border-gray-200 bg-gray-50"
                            : hasAnswered && answers[currentQuestionIndex] === oIdx 
                              ? "border-primary bg-primary/5 shadow-sm" 
                              : "border-transparent bg-gray-50 hover:bg-gray-100"
                          }
                          ${hasAnswered ? "cursor-not-allowed" : ""}
                        `}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestionIndex}`}
                          value={oIdx}
                          checked={answers[currentQuestionIndex] === oIdx}
                          onChange={() => handleAnswerSelect(currentQuestionIndex, oIdx)}
                          disabled={hasAnswered}
                          className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                        />
                        <span className={`flex-1 ${
                          showFeedback[currentQuestionIndex]
                            ? oIdx === currentQuestion.correctOptionIndex
                              ? "font-medium text-green-600"
                              : answers[currentQuestionIndex] === oIdx
                                ? "font-medium text-red-600"
                                : "text-gray-600"
                            : hasAnswered && answers[currentQuestionIndex] === oIdx 
                              ? "font-medium text-primary" 
                              : "text-gray-700"
                        }`}>
                          {option}
                        </span>
                        {showFeedback[currentQuestionIndex] && (
                          oIdx === currentQuestion.correctOptionIndex ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : answers[currentQuestionIndex] === oIdx ? (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          ) : null
                        )}
                        {!showFeedback[currentQuestionIndex] && hasAnswered && answers[currentQuestionIndex] === oIdx && (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        )}
                      </label>
                    ))}
                  </div>

                  {showFeedback[currentQuestionIndex] && (
                    <>
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-800 font-medium">
                          ✅ Bonne réponse : {currentQuestion.options[currentQuestion.correctOptionIndex]}
                        </p>
                      </div>
                      
                      {answers[currentQuestionIndex] !== currentQuestion.correctOptionIndex && (
                        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-orange-800 font-medium">
                            💡 {currentQuestion.explanation || "Consulte le texte pour trouver la réponse."}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {hasAnswered && (
                    <div className="flex justify-end mt-6">
                      {currentQuestionIndex < quizData.questions.length - 1 ? (
                        <button
                          onClick={handleNext}
                          className="px-6 py-2.5 rounded-lg bg-primary text-white font-bold shadow-md hover:bg-primary/90 transition-all duration-200 flex items-center gap-2"
                        >
                          Suivant
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentQuestionIndex(quizData.questions.length)}
                          className="px-6 py-2.5 rounded-lg bg-green-600 text-white font-bold shadow-md hover:bg-green-700 transition-all duration-200"
                        >
                          Terminer le quiz
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="sticky bottom-8 flex justify-center pt-4">
          <div className="glass-card p-6 rounded-2xl w-full max-w-md flex items-center justify-between gap-4 dark:bg-slate-800 dark:border-slate-700">
            <button
              onClick={() => {
                // Clear all quiz data and return home
                Object.keys(sessionStorage).forEach(key => {
                  if (key.startsWith('quiz_data_') || key.startsWith('quiz_result_')) {
                    sessionStorage.removeItem(key);
                  }
                });
                setLocation("/");
              }}
              className="px-4 py-2 rounded-lg bg-gray-600 text-white font-medium hover:bg-gray-700 transition-colors"
            >
              New Quiz
            </button>
            <div className="text-sm font-bold text-primary">
              Score : {score} / {quizData.questions.length}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
