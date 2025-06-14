import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ChatbotFAB } from '@/components/chatbot/ChatbotFAB';
import { BillingStatus } from '@/components/billing/BillingStatus';
import { CreditCard, User as UserIcon, MessageSquare, BookOpen, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

export default function Dashboard() {
    const navigate = useNavigate();
    const { userProfile, loading } = useUserRole();

    useEffect(() => {
        if (!loading && !userProfile) {
          toast.error('User Profile not found.');
          navigate('/');
        }
    }, [loading, userProfile, navigate]);

    const handleLogout = async () => {
        try {
            const auth = getAuth();
            await signOut(auth);
            navigate("/");
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    // Show loading state while checking authentication
    // if (loading) {
    //     return (
    //         <div className="min-h-screen bg-background flex items-center justify-center">
    //             <div className="flex flex-col items-center gap-4">
    //                 <Loader2 className="h-8 w-8 animate-spin text-study-purple" />
    //                 <p className="text-muted-foreground">Loading Your Dashboard...</p>
    //             </div>
    //         </div>
    //     );
    // }

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
            id: "settings",
            title: "Settings",
            description: "Manage your account settings", 
            icon: Settings,
            onClick: () => navigate("/dashboard/settings"),
            color: "text-gray-500"
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">
                            Welcome back, {userProfile?.name || 'User'}!
                        </p>
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={handleLogout}
                    >
                        Sign out
                    </Button>
                </div>

                {/* User Info & Billing Status */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserIcon className="h-5 w-5" />
                                    Profile Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-4">
                                    {userProfile?.avatar && (
                                        <img 
                                            src={userProfile.avatar} 
                                            alt="Profile" 
                                            className="h-16 w-16 rounded-full"
                                        />
                                    )}
                                    <div>
                                        <h3 className="text-lg font-semibold">{userProfile?.name || 'User'}</h3>
                                        <p className="text-muted-foreground">{userProfile?.email}</p>
                                        <div className="mt-2">
                                            <BillingStatus compact={true} showTitle={false} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <div>
                        <BillingStatus showTitle={true} />
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {dashboardCards.map((card) => (
                            <Card 
                                key={card.id} 
                                className="cursor-pointer hover:shadow-md transition-shadow"
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

                {/* Recent Activity Placeholder */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Your latest interactions and generated content</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No recent activity yet. Start by chatting with AI or generating content!</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <ChatbotFAB />
        </div>
    );
}