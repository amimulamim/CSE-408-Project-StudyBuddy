import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BillingSubscription } from '@/components/billing/BillingSubscription';
import { toast } from 'sonner';
import { Header } from '@/components/header/Header';
import { Footer } from '@/components/footer/Footer';

export default function BillingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const billingRef = useRef<{ refreshSubscriptionStatus: () => void }>(null);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      toast.success("Payment Successful", {
        description: "Your subscription is now active.",
      });
      // Clean up URL
      navigate('/dashboard/billing', { replace: true });
      // Refresh subscription status after a short delay
      setTimeout(() => {
        billingRef.current?.refreshSubscriptionStatus();
      }, 1000);
    } else if (success === 'false') {
      toast.error("Payment Failed", {
        description: "Something went wrong during payment.",
      });
      // Clean up URL
      navigate('/dashboard/billing', { replace: true });
    }
  }, [searchParams, toast, navigate]);

  return (
    <div className="dashboard-bg-animated">
      <Header />
      <div className="fixed top-20 bottom-0 w-screen overflow-y-auto scrollbar-hide">
      <div className="container mx-auto py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing information
          </p>
        </div>
        <BillingSubscription ref={billingRef} />
      </div>
      <Footer />
      </div>
    </div>
  );
}
