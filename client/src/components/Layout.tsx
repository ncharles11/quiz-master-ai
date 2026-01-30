import { Link } from "wouter";
import { BrainCircuit, BookOpen, History, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex flex-col font-body text-foreground selection:bg-primary/10 transition-colors duration-300">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-slate-900 dark:text-white">QuizGen<span className="text-primary">.ai</span></span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground dark:text-slate-300">
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              New Quiz
            </Link>
            <Link href="/history" className="hover:text-primary transition-colors flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </Link>
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 flex items-center justify-center"
              title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Mobile Theme Toggle */}
          <div className="md:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
              title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} QuizGen.ai. Powered by Google Gemini.</p>
        </div>
      </footer>
    </div>
  );
}
