import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Crown, Calendar, CreditCard, Clock } from "lucide-react";
import { 
  getSubscriptionStatus, 
  getStatusColor, 
  getStatusLabel, 
} from "@/lib/billing";
import { SubscriptionStatus } from "@/lib/billingTypes";

interface BillingStatusProps {
  showTitle?: boolean;
  compact?: boolean;
}

export function BillingStatus({ showTitle = true, compact = false }: BillingStatusProps) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const status = await getSubscriptionStatus();
      setSubscription(status);
    } catch (error) {
      console.error("Failed to load subscription status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardContent className={compact ? "p-0" : ""}>
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="h-4 w-24 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {subscription ? (
          <>
            <Crown className="h-4 w-4 text-yellow-500" />
            <Badge className={getStatusColor(subscription.status)}>
              {getStatusLabel(subscription.status)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {subscription.plan_id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </>
        ) : (
          <>
            <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
            <Badge variant="secondary">Free Plan</Badge>
          </>
        )}
      </div>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing Status
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? "pt-0" : ""}>
        {subscription ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">
                  {subscription.plan_id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <Badge className={getStatusColor(subscription.status)}>
                {getStatusLabel(subscription.status)}
              </Badge>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Started</span>
                </div>
                <span className="text-sm font-medium">
                  {new Date(subscription.start_date).toLocaleDateString()}
                </span>
              </div>
              
              {subscription.end_date && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {subscription.status === "active" ? "Renews" : "Ended"}
                    </span>
                  </div>
                  <span className="text-sm font-medium">
                    {new Date(subscription.end_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {subscription.cancel_at && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Cancels At</span>
                  </div>
                  <span className="text-sm font-medium text-orange-600">
                    {new Date(subscription.cancel_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Crown className="h-6 w-6 text-gray-400" />
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Free Plan</h4>
            <p className="text-sm text-muted-foreground">
              Upgrade to unlock premium features
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
