import { useNavigate } from "react-router-dom";
import { QuizDashboard } from '@/components/quiz/QuizDashboard';
import { ChatbotFAB } from '@/components/chatbot/ChatbotFAB';


export default function QuizPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen ">
            <div className="container mx-auto py-6 space-y-6">
                <QuizDashboard />
            </div>
            <ChatbotFAB />
        </div>
    );
}