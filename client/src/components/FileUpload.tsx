import { useState, useRef } from "react";
import { UploadCloud, FileText, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        handleFile(file);
      } else {
        // Ideally show toast error here
        alert("Please upload a PDF file");
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    onFileSelect(file);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onClick={() => !isLoading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ease-out overflow-hidden bg-white",
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-gray-200 hover:border-primary/50 hover:bg-gray-50",
          isLoading && "pointer-events-none opacity-80"
        )}
      >
        <div className="p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept=".pdf"
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                </div>
                <h3 className="mt-6 text-xl font-display font-bold text-foreground">Analyzing Document</h3>
                <p className="mt-2 text-muted-foreground max-w-xs mx-auto">
                  Extracting text and generating smart questions with AI...
                </p>
              </motion.div>
            ) : selectedFile ? (
              <motion.div
                key="selected"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center w-full"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <FileText className="w-10 h-10 text-primary" />
                </div>
                <p className="text-lg font-medium text-foreground truncate max-w-[80%] mb-2">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to process
                </p>
                
                <button
                  onClick={clearFile}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <UploadCloud className="w-10 h-10 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground">
                  Upload your PDF
                </h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                  Drag and drop your file here, or click to browse. We'll generate a quiz instantly.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Progress Bar (Fake) when loading */}
        {isLoading && (
          <motion.div 
            className="absolute bottom-0 left-0 h-1.5 bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 8, ease: "linear" }}
          />
        )}
      </div>
    </div>
  );
}
