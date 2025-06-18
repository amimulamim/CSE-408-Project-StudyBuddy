import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';

export default function Profile() {
    const navigate = useNavigate();
    const { userProfile, loading, refetchUserProfile } = useUserRole();

    useEffect(() => {
        if (!loading && !userProfile) {
            toast.error('User Profile not found.');
            navigate('/dashboard');
        }
    }, [loading, userProfile, navigate]);

    const handleProfileUpdate = (updatedData: any) => {
        refetchUserProfile?.();
        toast.success('Profile updated successfully!');
    };

    if (loading) {
        return (
            <div className="dashboard-bg-animated h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-study-purple" />
                    <p className="text-muted-foreground">Loading Your Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen dashboard-bg-animated">
            <div className="container mx-auto py-6 space-y-6">
                {/* Back Button - Positioned at top */}
                <div className="mb-2">
                    <Button 
                        variant="ghost" 
                        onClick={() => navigate('/dashboard')}
                        className="text-muted-foreground hover:text-foreground -ml-2"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">Profile</h1>
                    <p className="text-muted-foreground">
                        Manage your account information and preferences
                    </p>
                </div>

                {/* Profile Card */}
                <div className="max-w-4xl">
                    {userProfile && (
                        <ProfileCard 
                            userProfile={userProfile} 
                            onProfileUpdate={handleProfileUpdate}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}