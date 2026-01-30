import { useQuizzes } from "@/hooks/use-quiz";
import { Layout } from "@/components/Layout";
import { Loader2, FileText, Calendar } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function History() {
  const { data: quizzes, isLoading } = useQuizzes();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b pb-6">
          <div>
            <h1 className="text-3xl font-display font-bold">Quiz History</h1>
            <p className="text-muted-foreground mt-1">Review your past generated quizzes</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : !quizzes?.length ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No quizzes yet</h3>
            <p className="text-gray-500 mb-6">Upload a PDF to generate your first quiz!</p>
            <Link href="/">
              <button className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                Create Quiz
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {quizzes.map((quiz: any) => (
              <div 
                key={quiz.id} 
                className="bg-white p-6 rounded-2xl border hover:shadow-lg transition-shadow group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {quiz.createdAt ? format(new Date(quiz.createdAt), 'MMM d, yyyy') : 'Recent'}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold font-display mb-2 truncate" title={quiz.originalFilename}>
                  {quiz.originalFilename}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {quiz.quizContent?.questions?.length || 5} Questions
                </p>
                
                <button 
                  onClick={() => {
                     // Since we don't have a backend "get quiz details" endpoint fully spec'd out in the
                     // prompt's explicit route list (only list and submit), we will simulate retaking
                     // by alerting or if we implemented re-fetch logic.
                     // For MVP, this history view confirms storage works.
                     alert("To retake this quiz, please re-upload the file or implement GET /api/quiz/:id");
                  }}
                  className="w-full py-2.5 rounded-xl border-2 border-gray-100 font-semibold text-gray-600 hover:border-primary hover:text-primary transition-colors text-sm"
                >
                  Retake Quiz (Coming Soon)
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
