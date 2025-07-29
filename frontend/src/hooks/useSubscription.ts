import { useState, useEffect, useCallback } from 'react';
import { getSubscriptionStatus } from '@/lib/billing';
import { SubscriptionStatus } from '@/lib/billingTypes';

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubscriptionStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await getSubscriptionStatus();
      setSubscription(status);
    } catch (error: any) {
      console.error("Failed to load subscription status:", error);
      setError(error.message || "Failed to load subscription status");
      // Don't set subscription to null on error, keep existing data
      // Only set to null if it's a 404 (no subscription found)
      if (error?.status === 404) {
        setSubscription(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSubscription = useCallback(() => {
    return loadSubscriptionStatus();
  }, [loadSubscriptionStatus]);

  useEffect(() => {
    loadSubscriptionStatus();
  }, [loadSubscriptionStatus]);

  // Listen for custom events to refresh subscription
  useEffect(() => {
    const handleRefreshSubscription = () => {
      refreshSubscription();
    };

    const handleVisibilityChange = () => {
      // Refresh subscription when tab becomes visible again
      if (!document.hidden) {
        refreshSubscription();
      }
    };

    const handleFocus = () => {
      // Refresh subscription when window gains focus
      refreshSubscription();
    };

    window.addEventListener('refreshSubscription', handleRefreshSubscription);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('refreshSubscription', handleRefreshSubscription);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSubscription]);

  return {
    subscription,
    loading,
    error,
    refreshSubscription,
  };
}

// Utility function to trigger subscription refresh from anywhere in the app
export const triggerSubscriptionRefresh = () => {
  window.dispatchEvent(new CustomEvent('refreshSubscription'));
};
