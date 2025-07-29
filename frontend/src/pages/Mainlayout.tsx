import { Outlet, useNavigate } from "react-router-dom";
import { LoadedHeader } from "./Dashboard";
import { Footer } from "@/components/footer/Footer";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/header/Header";

const MainLayout = () => {

  const navigate = useNavigate();

  const { userProfile, loading, refetchUserProfile } = useUserRole();
  const { subscription, loading: billingLoading } = useSubscription();

  useEffect(() => {
    if (!loading && !userProfile) {
      toast.error('User Profile not found.');
      navigate('/');
    }
  }, [loading, userProfile, navigate]);

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

  return (
    <div className="dashboard-bg-animated min-h-screen">
      <Header 
        userProfile={userProfile} 
        subscription={subscription}
        billingLoading={billingLoading}
      />
      <div className="fixed top-0 bottom-0 pt-20 w-screen overflow-y-auto scrollbar-hide">
        <Outlet />
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
