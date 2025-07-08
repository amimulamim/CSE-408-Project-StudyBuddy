import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QuizDashboard } from '@/components/quiz/QuizDashboard';
import { ChatbotFAB } from '@/components/chatbot/ChatbotFAB';

export default function QuizPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen dashboard-bg-animated">
            <div className="container mx-auto py-6 space-y-6">
                {/* Quiz Dashboard */}
                <QuizDashboard />
            </div>
            
            <ChatbotFAB />
        </div>
    );
}