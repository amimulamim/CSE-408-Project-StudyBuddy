import { Toaster } from 'sonner';
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminDashboard from "@/pages/AdminDashboard";
import QuizTaker from "@/pages/QuizTaker";
import QuizResults from "@/pages/QuizResults";


// import RedirectHandler from "./pages/RedirectHandler";


import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Chatbot from "./pages/Chatbot";
import Billing from "./pages/Billing";
import { AuthRedirectHandler } from './components/auth/AuthRedirectHandler';
// import { PaymentResult } from "@/components/billing/PaymentResult"; 
import Profile from './pages/Profile';

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
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/quiz/take/:id" element={<QuizTaker />} />
            <Route path="/quiz/results/:id" element={<QuizResults />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
