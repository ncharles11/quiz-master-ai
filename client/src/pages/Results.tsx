import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { type SubmitQuizResponse } from "@shared/schema";
import { motion } from "framer-motion";
import { Check, X, ArrowRight, RotateCcw, Award } from "lucide-react";
import confetti from "canvas-confetti";

export default function Results() {
  const [match, params] = useRoute("/quiz/:id/results");
  const quizId = params?.id ? parseInt(params.id) : 0;
  const [results, setResults] = useState<SubmitQuizResponse | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`quiz_result_${quizId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as SubmitQuizResponse;
      setResults(parsed);
      
      // Fire confetti if score is good (> 60%)
      if (parsed.score / parsed.total > 0.6) {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const random = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      }
    }
  }, [quizId]);

  if (!results) return null;

  const percentage = Math.round((results.score / results.total) * 100);
  let gradeColor = "text-red-500";
  let gradeBg = "bg-red-50";
  let message = "Keep studying!";
  
  if (percentage >= 80) {
    gradeColor = "text-green-600";
    gradeBg = "bg-green-50";
    message = "Outstanding!";
  } else if (percentage >= 60) {
    gradeColor = "text-amber-600";
    gradeBg = "bg-amber-50";
    message = "Good job!";
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Score Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 md:p-16 text-center relative overflow-hidden"
        >
          <div className={`absolute top-0 left-0 w-full h-2 ${gradeBg.replace("bg-", "bg-opacity-50 bg-")}`} />
          
          <div className="relative z-10">
            <div className={`w-24 h-24 mx-auto ${gradeBg} rounded-full flex items-center justify-center mb-6`}>
              <Award className={`w-12 h-12 ${gradeColor}`} />
            </div>
            
            <h1 className="text-4xl font-display font-bold mb-2">
              {message}
            </h1>
            <p className="text-2xl font-bold text-primary mb-8">
              {results.score} / {results.total}
            </p>
            <p className="text-muted-foreground mb-8">
              You scored <span className={`font-bold text-xl ${gradeColor}`}>{percentage}%</span> on this quiz
            </p>
            
            <div className="flex justify-center gap-4">
              <Link href="/">
                <button className="px-8 py-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 text-lg">
                  <RotateCcw className="w-5 h-5" />
                  Try Another PDF
                </button>
              </Link>
              {/* Could add a Retake button if we stored the quiz data properly */}
            </div>
          </div>
        </motion.div>

        {/* Detailed Results */}
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold px-2">Detailed Analysis</h2>
          
          {results.results.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 + 0.3 }}
              className={`
                bg-white rounded-2xl p-6 border-l-4 shadow-lg hover:shadow-xl transition-all duration-300
                ${item.isCorrect ? "border-l-green-500" : "border-l-red-500"}
              `}
            >
              <div className="flex gap-4">
                <div className={`
                  mt-1 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                  ${item.isCorrect ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
                `}>
                  {item.isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
                
                <div className="flex-1 space-y-3">
                  <h3 className="font-medium text-lg leading-snug">
                    {item.questionText}
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm mt-4">
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">
                        Your Answer
                      </span>
                      <span className={item.isCorrect ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                        {item.userAnswer}
                      </span>
                    </div>
                    
                    {!item.isCorrect && (
                      <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                        <span className="block text-xs uppercase tracking-wider text-green-700 font-bold mb-1">
                          Correct Answer
                        </span>
                        <span className="text-green-800 font-medium">
                          {item.correctAnswer}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
