import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";
import { BillingSubscription } from '@/components/billing/BillingSubscription';
import { toast } from 'sonner';

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
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing information
          </p>
        </div>

        <BillingSubscription ref={billingRef} />
      </div>
    </div>
  );
}
