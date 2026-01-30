# QuizGen.ai

## Overview

QuizGen.ai is an AI-powered quiz generation application that transforms PDF documents into interactive quizzes. Users upload PDF files, the system extracts text content, sends it to OpenAI to generate multiple-choice questions, and presents an interactive quiz experience with scoring and celebration effects.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, sessionStorage for quiz data passing between pages
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite with path aliases (@/, @shared/, @assets/)

Key pages:
- Home: PDF upload interface
- Quiz: Interactive question-answering experience
- Results: Score display with confetti celebration
- History: List of previously generated quizzes

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under /api prefix
- **File Handling**: Multer for PDF upload processing
- **PDF Parsing**: pdf-parse library for text extraction

Key endpoints:
- POST /api/quiz/upload - Accepts PDF, extracts text, calls OpenAI, creates quiz
- POST /api/quiz/:id/submit - Submits answers and calculates score
- GET /api/quizzes - Lists all generated quizzes

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: shared/schema.ts
- **Migrations**: Drizzle Kit with migrations output to ./migrations

Tables:
- quizzes: Stores quiz metadata and generated questions (JSONB)
- results: Stores quiz attempt scores

### Build System
- **Development**: tsx for running TypeScript directly
- **Production Build**: esbuild for server, Vite for client
- **Output**: dist/index.cjs (server), dist/public (client assets)

## External Dependencies

### APIs
- **OpenAI API**: Used to generate quiz questions from extracted PDF text. Requires OPENAI_API_KEY environment variable.

### Database
- **PostgreSQL**: Primary data store. Requires DATABASE_URL environment variable.

### Key NPM Packages
- drizzle-orm / drizzle-kit: Database ORM and migrations
- openai: Official OpenAI SDK
- pdf-parse: PDF text extraction
- @tanstack/react-query: Async state management
- framer-motion: Animation library
- canvas-confetti: Celebration effects on quiz completion
- shadcn/ui components: Pre-built accessible UI components (Radix UI primitives)