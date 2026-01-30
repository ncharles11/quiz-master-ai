import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { FileUpload } from "@/components/FileUpload";
import { useUploadQuiz } from "@/hooks/use-quiz";
import { Sparkles, Brain, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const uploadQuiz = useUploadQuiz();

  const handleGenerate = () => {
    if (!file) return;
    
    // Clear any existing quiz data to prevent mixing
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('quiz_data_') || key.startsWith('quiz_result_')) {
        sessionStorage.removeItem(key);
      }
    });
    
    uploadQuiz.mutate(file, {
      onSuccess: (data) => {
        // Pass the generated data via location state is tricky in wouter
        // We will store it in sessionStorage for simplicity or pass via query params if small
        // But for this robust app, let's use a simple state management pattern by 
        // passing data to the route via history state (wouter supports this implicitly via browser history API but it's not typesafe)
        
        // Better approach for this demo: Save to sessionStorage and redirect with ID
        sessionStorage.setItem(`quiz_data_${data.id}`, JSON.stringify(data));
        setLocation(`/quiz/${data.id}`);
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 pt-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Learning</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-display font-bold text-foreground leading-tight"
          >
            Turn any PDF into <br/>
            <span className="text-gradient">an interactive quiz</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Upload your study notes, textbooks, or research papers. Our AI extracts key concepts and tests your knowledge instantly.
          </motion.p>
        </div>

        {/* Upload Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <FileUpload 
            onFileSelect={setFile} 
            isLoading={uploadQuiz.isPending} 
          />
          
          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={!file || uploadQuiz.isPending}
              className={`
                px-8 py-4 rounded-xl font-bold text-lg shadow-lg flex items-center gap-3
                transition-all duration-300 transform
                ${!file || uploadQuiz.isPending 
                  ? "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed" 
                  : "bg-primary text-white hover:bg-primary/90 hover:shadow-primary/25 hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
                }
              `}
            >
              {uploadQuiz.isPending ? "Generating..." : "Generate Quiz"}
              {!uploadQuiz.isPending && <Zap className="w-5 h-5 fill-current" />}
            </button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid md:grid-cols-3 gap-8 pt-12 border-t border-gray-200 dark:border-slate-700"
        >
          <FeatureCard 
            icon={<Brain className="w-6 h-6 text-indigo-500" />}
            title="Smart Extraction"
            description="We use GPT-4o to understand context, not just keywords."
          />
          <FeatureCard 
            icon={<Sparkles className="w-6 h-6 text-amber-500" />}
            title="Instant Feedback"
            description="Get immediate explanations for every answer you submit."
          />
          <FeatureCard 
            icon={<Zap className="w-6 h-6 text-teal-500" />}
            title="Active Recall"
            description="Test your knowledge immediately to improve retention."
          />
        </motion.div>
      </div>
    </Layout>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border dark:border-slate-700 hover:shadow-lg transition-all duration-300">
      <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-slate-700 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold font-display text-lg mb-2 text-slate-900 dark:text-white">{title}</h3>
      <p className="text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
