import { Link } from "wouter";
import { BrainCircuit, BookOpen, History } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-body text-foreground selection:bg-primary/10">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">QuizGen<span className="text-primary">.ai</span></span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              New Quiz
            </Link>
            <Link href="/history" className="hover:text-primary transition-colors flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </Link>
          </div>
          
          <div className="md:hidden">
            {/* Mobile menu could go here */}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-white">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} QuizGen.ai. Powered by OpenAI.</p>
        </div>
      </footer>
    </div>
  );
}
