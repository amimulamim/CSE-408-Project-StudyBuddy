import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationButton } from "@/components/notifications/NotificationButton";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChatbotFAB } from '@/components/chatbot/ChatbotFAB';
import { QuizDashboard } from '@/components/quiz/QuizDashboard';
import { CreditCard, MessageSquare, BookOpen, Settings, Loader2, Brain, User, Crown, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  getSubscriptionStatus, 
  getStatusColor, 
  getStatusLabel,
  type SubscriptionStatus 
} from "@/lib/billing";

export default function Dashboard() {
    const navigate = useNavigate();
    const { userProfile, loading, refetchUserProfile } = useUserRole();
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [billingLoading, setBillingLoading] = useState(true);

    useEffect(() => {
        if (!loading && !userProfile) {
          toast.error('User Profile not found.');
          navigate('/');
        }
    }, [loading, userProfile, navigate]);

    useEffect(() => {
        loadSubscriptionStatus();
    }, []);

    const loadSubscriptionStatus = async () => {
        try {
            setBillingLoading(true);
            const status = await getSubscriptionStatus();
            setSubscription(status);
        } catch (error) {
            console.error("Failed to load subscription status:", error);
        } finally {
            setBillingLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            const auth = getAuth();
            await signOut(auth);
            navigate("/");
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getCurrentTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const getPlanDisplayName = (planId: string) => {
        return planId?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Free';
    };

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="dashboard-bg-animated h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-study-purple" />
                    <p className="text-muted-foreground">Loading Your Dashboard...</p>
                </div>
            </div>
        );
    }

    const dashboardCards = [
        {
            id: "chat",
            title: "AI Chat",
            description: "Chat with AI for instant help",
            icon: MessageSquare,
            onClick: () => navigate("/chatbot"),
            color: "text-blue-500"
        },
        {
            id: "quiz",
            title: "Quiz Center",
            description: "Take quizzes and test your knowledge",
            icon: Brain,
            onClick: () => {}, // Will be handled by scroll to quiz section
            color: "text-purple-500"
        },
        {
            id: "billing",
            title: "Billing",
            description: "Manage your subscription",
            icon: CreditCard,
            onClick: () => navigate("/dashboard/billing"),
            color: "text-green-500"
        },
        {
            id: "content",
            title: "Content Library",
            description: "Access your generated content",
            icon: BookOpen,
            onClick: () => navigate("/dashboard/content"),
            color: "text-purple-500"
        },
        {
            id: "profile",
            title: "Profile",
            description: "Manage your profile and preferences",
            icon: User,
            onClick: () => navigate("/profile"),
            color: "text-indigo-500"
        },
        {
            id: "settings",
            title: "Settings",
            description: "Manage your account settings", 
            icon: Settings,
            onClick: () => navigate("/dashboard/settings"),
            color: "text-gray-500"
        }
    ];

    const scrollToQuiz = () => {
        const quizSection = document.getElementById('quiz-section');
        if (quizSection) {
            quizSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen dashboard-bg-animated">
            <div className="container mx-auto py-6 space-y-8">
                {/* Modern Header */}
                <div className="relative overflow-hidden rounded-2xl glass-card">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
                    <div className="relative p-6 md:p-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            {/* Left side - User Info */}
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16 ring-2 ring-white shadow-md">
                                    <AvatarImage src={userProfile?.avatar} alt={userProfile?.name} />
                                    <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                        {getInitials(userProfile?.name || 'User')}
                                    </AvatarFallback>
                                </Avatar>
                                
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h1 className="glass-text-title font-bold md:text-3xl">
                                            {getCurrentTimeGreeting()}, {userProfile?.name?.split(' ')[0] || 'User'}!
                                        </h1>
                                        <Sparkles className="h-5 w-5 text-yellow-500" />
                                    </div>
                                    <p className="glass-text-description">Ready to learn something new today?</p>
                                </div>
                            </div>

                            {/* Right side - Plan Status & Actions */}
                            <div className="flex items-center gap-3">
                                {/* Plan Badge */}
                                <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 border border-white/50 shadow-sm">
                                    {billingLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 bg-gray-300 rounded-full animate-pulse"></div>
                                            <div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div>
                                        </div>
                                    ) : (
                                        <>
                                            <Crown className={`h-4 w-4 ${
                                                subscription?.plan_id && subscription.plan_id !== 'free' 
                                                    ? 'text-yellow-500' 
                                                    : 'text-gray-400'
                                            }`} />
                                            <span className="text-sm font-medium text-gray-900">
                                                {subscription ? getPlanDisplayName(subscription.plan_id) : 'Free Plan'}
                                            </span>
                                            {subscription && (
                                                <Badge 
                                                    className={`${getStatusColor(subscription.status)} text-xs`}
                                                    variant="secondary"
                                                >
                                                    {getStatusLabel(subscription.status)}
                                                </Badge>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Notifications */}
                                <NotificationButton />

                                {/* Actions */}
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={handleLogout}
                                    className="bg-white/50 backdrop-blur-sm hover:bg-white/70 border border-white/50"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign out
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-gradient-to-tr from-purple-400/20 to-pink-400/20 blur-xl"></div>
                </div>

                {/* Main Content Grid - Updated to single column */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dashboardCards.map((card) => (
                                <Card 
                                    key={card.id} 
                                    className="glass-card-hover-strong"
                                    onClick={card.id === 'quiz' ? scrollToQuiz : card.onClick}
                                >
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <card.icon className={`h-5 w-5 ${card.color}`} />
                                            {card.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription>{card.description}</CardDescription>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="glass-text-title">Recent Activity</CardTitle>
                        <CardDescription className="glass-text-description">Your latest interactions and generated content</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8">
                            <div className="relative mb-4">
                                <BookOpen className="h-12 w-12 mx-auto text-gray-300 opacity-60" />
                            </div>
                            <p className="glass-text-description">No recent activity yet. Start by chatting with AI or generating content!</p>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Quiz Section */}
                <div id="quiz-section">
                    <QuizDashboard />
                </div>

            </div>
            
            <ChatbotFAB />
        </div>
    );
}
