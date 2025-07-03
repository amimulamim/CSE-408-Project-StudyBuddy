import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Check, X } from "lucide-react";
import { 
  getSubscriptionStatus, 
  cancelSubscription, 
  createCheckoutSession,
  formatPrice,
  formatInterval,
  getStatusColor,
  getStatusLabel, 
} from "@/lib/billing";
import { toast } from 'sonner';
import { SubscriptionStatus } from "@/lib/billingTypes";

// Available plans (could be fetched from API in the future)
const AVAILABLE_PLANS = [
  {
    id: "premium_monthly",
    name: "Premium Monthly",
    price_cents: 100000, // 1000 BDT
    currency: "BDT",
    interval: "monthly",
    is_active: true,
    features: [
      "Unlimited AI-generated content",
      "Advanced quiz features",
      "Priority support",
      "Export to PDF",
      "Advanced analytics"
    ]
  },
  {
    id: "premium_yearly",
    name: "Premium Yearly",
    price_cents: 1000000, // 10000 BDT
    currency: "BDT", 
    interval: "yearly",
    is_active: true,
    features: [
      "All Monthly features",
      "2 months free",
      "Priority customer support",
      "Early access to new features",
      "Advanced collaboration tools"
    ]
  }
];

export const BillingSubscription = forwardRef<{ refreshSubscriptionStatus: () => void }>((props, ref) => {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);


  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const status = await getSubscriptionStatus();
      setSubscription(status);
    } catch (error: any) {
      console.error("Failed to load subscription status:", error);
      // Don't show error toast for no subscription found
      if (error?.status !== 404) {
        toast.error("Failed to load subscription status", {
          description: error?.message || "An unexpected error occurred"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh method via ref
  useImperativeHandle(ref, () => ({
    refreshSubscriptionStatus: loadSubscriptionStatus
  }));

  const handleSubscribe = async (planId: string) => {
    try {
      setProcessing(true);
      
      const currentUrl = window.location.origin;
      // Only send plan_id and frontend_base_url
      const session = {
        plan_id: planId,
        frontend_base_url: currentUrl
      };

      const result = await createCheckoutSession(session);
      
      // Redirect to payment gateway
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Failed to create checkout session:", error);
      toast.error("Failed to create checkout session", {
        description: error?.message || "An unexpected error occurred"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? This action cannot be undone.")) {
      return;
    }

    try {
      setProcessing(true);
      await cancelSubscription();
      
      toast.success("Subscription cancelled successfully", {
        description: "Your subscription has been cancelled. You will not be charged again."
      });
      
      // Reload subscription status
      await loadSubscriptionStatus();
    } catch (error: any) {
      console.error("Failed to cancel subscription:", error);
      toast.error("Failed to cancel subscription", {
        description: error?.message || "An unexpected error occurred"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      {subscription && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Current Subscription
                </CardTitle>
                <CardDescription>
                  Your active subscription details
                </CardDescription>
              </div>
              <Badge className={getStatusColor(subscription.status)}>
                {getStatusLabel(subscription.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Plan</p>
                <p className="text-lg font-semibold">{subscription.plan_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className={`text-lg font-semibold ${getStatusColor(subscription.status)}`}>
                  {getStatusLabel(subscription.status)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                <p className="text-lg">{new Date(subscription.start_date).toLocaleDateString()}</p>
              </div>
              {subscription.end_date && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p className="text-lg">{new Date(subscription.end_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </CardContent>
          {subscription.status === "active" && (
            <CardFooter>
              <Button 
                variant="destructive" 
                onClick={handleCancelSubscription}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cancel Subscription
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h3 className="text-2xl font-bold mb-4">
          {subscription ? "Upgrade Your Plan" : "Choose Your Plan"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {AVAILABLE_PLANS.map((plan) => (
            <Card key={plan.id} className="relative glass-card-interactive">
              {plan.interval === "yearly" && (
                <div className="absolute top-1 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 hover:bg-green-500">
                    Save 17%
                  </Badge>
                </div>
              )}
              <CardHeader className="mt-2">
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  <Crown className="h-5 w-5 text-yellow-500" />
                </CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">
                    {formatPrice(plan.price_cents, plan.currency)}
                  </span>
                  <span className="text-muted-foreground">
                    /{formatInterval(plan.interval)}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={processing || (subscription?.status === "active" && subscription.plan_id === plan.id)}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : subscription?.status === "active" && subscription.plan_id === plan.id ? (
                    "Current Plan"
                  ) : subscription ? (
                    "Switch Plan"
                  ) : (
                    "Subscribe Now"
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {!subscription && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Free Plan</CardTitle>
            <CardDescription>Current plan - Limited features</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Basic AI content generation (5 per day)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Basic quiz features</span>
              </li>
              <li className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Advanced features</span>
              </li>
              <li className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Priority support</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
