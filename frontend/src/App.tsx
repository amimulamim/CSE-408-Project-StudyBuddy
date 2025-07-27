import { Toaster } from 'sonner';
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminDashboard from "@/pages/AdminDashboard";
import QuizTaker from "@/pages/QuizTaker";
import QuizResults from "@/pages/QuizResults";
import ContentLibrary from '@/pages/ContentLibrary';
import FlashcardsView from '@/pages/FlashcardsView';
import SlidesView from '@/pages/SlidesView';

// import RedirectHandler from "./pages/RedirectHandler";
// import not needed anymore, replaced by the new routing system

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Chatbot from "./pages/Chatbot";
import Billing from "./pages/Billing";
// import { PaymentResult } from "@/components/billing/PaymentResult"; 
import Profile from './pages/Profile';
import QuizPage from './pages/QuizPage';
import QuizTakePage from './pages/QuizTakePage';
import QuizResultsPage from './pages/QuizResultsPage';
import CollectionsPage from './pages/CollectionsPage';
import DocumentsPage from './pages/DocumentsPage';

const queryClient = new QueryClient();


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster richColors/>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/billing" element={<Billing />} />
            <Route path="/dashboard/content" element={<ContentLibrary />} />
            <Route path="/dashboard/quiz" element={<QuizPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/:collectionName" element={<DocumentsPage />} />
            <Route path="/content/flashcards/:contentId" element={<FlashcardsView />} />
            <Route path="/content/slides/:contentId" element={<SlidesView />} />
            <Route path="/content/document/:collectionName/:documentId" element={<SlidesView contentType="document" />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/quiz/take/:quizId" element={<QuizTakePage />} />
            <Route path="/quiz/results/:quizId" element={<QuizResultsPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
