import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ChatbotFAB } from '@/components/chatbot/ChatbotFAB';
import { CreditCard, MessageSquare, BookOpen, Loader2, Brain, User, Crown, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";
import { RecentActivities } from "@/components/activity/RecentActivities";

let LoadedHeader = null;

export default function Dashboard() {
    const navigate = useNavigate();
    const { userProfile, loading } = useUserRole();
    const { subscription, loading: billingLoading } = useSubscription();

    useEffect(() => {
        if (!loading && !userProfile) {
          toast.error('User Profile not found.');
          navigate('/');
        }
    }, [loading, userProfile, navigate]);


    const getCurrentTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
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
            onClick: () => navigate("/dashboard/quiz"),
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
            id: "collections",
            title: "Collections",
            description: "View your uploaded resources", 
            icon: BookOpen,
            onClick: () => navigate("/collections"),
            color: "text-gray-500"
        }
    ];

    LoadedHeader = (
        <Header  
            userProfile={userProfile} 
            subscription={subscription}
            billingLoading={billingLoading}
        />
    )

    return (
        // <div className="dashboard-bg-animated min-h-screen">
        //     <Header  
        //         userProfile={userProfile} 
        //         subscription={subscription}
        //         billingLoading={billingLoading}
        //     />
        //     <div className="fixed top-0 bottom-0 overflow-y-auto w-screen scrollbar-hide pt-20">
        //         <div className="min-h-screen">
        //             <div className="container mx-auto mb-12 py-8 space-y-8">
        //                 {/* Main Content Grid */}
        //                 <div className="space-y-6">
        //                     {/* Quick Actions */}
        //                     <div>
        //                         <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
        //                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        //                             {dashboardCards.map((card) => (
        //                                 <Card 
        //                                     key={card.id} 
        //                                     className="glass-card-hover-strong cursor-pointer"
        //                                     onClick={card.onClick}
        //                                 >
        //                                     <CardHeader className="pb-3">
        //                                         <CardTitle className="flex items-center gap-2 text-lg">
        //                                             <card.icon className={`h-5 w-5 ${card.color}`} />
        //                                             {card.title}
        //                                         </CardTitle>
        //                                     </CardHeader>
        //                                     <CardContent>
        //                                         <CardDescription>{card.description}</CardDescription>
        //                                     </CardContent>
        //                                 </Card>
        //                             ))}
        //                         </div>
        //                     </div>
        //                 </div>

        //                 {/* Recent Activity */}
        //                 <Card className="glass-card">
        //                     <CardHeader>
        //                         <CardTitle className="glass-text-title">Recent Activity</CardTitle>
        //                         <CardDescription className="glass-text-description">Your latest interactions and generated content</CardDescription>
        //                     </CardHeader>
        //                     <CardContent>
        //                         <div className="text-center py-8">
        //                             <div className="relative mb-4">
        //                                 <BookOpen className="h-12 w-12 mx-auto text-gray-300 opacity-60" />
        //                             </div>
        //                             <p className="glass-text-description">No recent activity yet. Start by chatting with AI or generating content!</p>
        //                         </div>
        //                     </CardContent>
        //                 </Card>
        //             </div>
        //             <Footer />
        //             <ChatbotFAB />
        //         </div>
        //     </div>
        // </div>

        <div className="min-h-screen">
            <div className="container xl:max-w-screen-xl px-4 mx-auto mb-12 py-8 space-y-8">
                {/* Main Content Grid */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dashboardCards.map((card) => (
                                <Card 
                                    key={card.id} 
                                    className="glass-card-hover-strong cursor-pointer"
                                    onClick={card.onClick}
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
                <RecentActivities />
            </div>
            {/* <Footer /> */}
            <ChatbotFAB />
        </div>
    );
}

export { LoadedHeader };
