import { Button } from "@/components/ui/button";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ChatbotFAB } from '@/components/chatbot/ChatbotFAB';

export default function Dashboard() {
    const navigate = useNavigate();
    const auth = getAuth();
    const user = auth.currentUser;
    const handleLogout = async () => {
        try {
          await signOut(auth);
          navigate("/");
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Error logging out:", error);
        }
    };
    return (
        <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-4 text-lg">{`Welcome ${user?.displayName} to your dashboard!`}</p>
            <Button 
                className="w-full button-gradient" 
                onClick={handleLogout}
            >
                Sign out
            </Button>
            <ChatbotFAB />
        </div>
    )
}