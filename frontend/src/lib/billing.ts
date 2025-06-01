import { makeRequest } from "@/lib/apiCall";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// Billing types based on backend schemas
export interface Plan {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: string;
  is_active: boolean;
}

export interface SubscriptionStatus {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  start_date: string;
  end_date?: string;
  cancel_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CheckoutSession {
  plan_id: string;
  success_url: string;
  cancel_url: string;
}

export interface CheckoutResponse {
  checkout_url: string;
  subscription_id: string;
}

// API functions
export async function createCheckoutSession(session: CheckoutSession): Promise<CheckoutResponse> {
  const url = `${API_BASE_URL}/api/v1/billing/subscribe`;
  return makeRequest<CheckoutResponse>(url, "POST", session);
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
  const url = `${API_BASE_URL}/api/v1/billing/status`;
  const response = await makeRequest<SubscriptionStatus>(url, "GET", null);
  
  // Handle 404 response (no subscription) gracefully
  if (typeof response === 'object' && 'status' in response && response.status === 'error') {
    return null;
  }
  
  return response as SubscriptionStatus;
}

export async function cancelSubscription(): Promise<{ message: string }> {
  const url = `${API_BASE_URL}/api/v1/billing/cancel`;
  return makeRequest<{ message: string }>(url, "POST", null);
}

// Utility functions
export function formatPrice(price_cents: number, currency: string = "BDT"): string {
  const price = price_cents / 100;
  return `${price.toFixed(0)} ${currency}`;
}

export function formatInterval(interval: string): string {
  return interval === "monthly" ? "month" : interval === "yearly" ? "year" : interval;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "text-green-600";
    case "canceled":
      return "text-red-600";
    case "past_due":
      return "text-yellow-600";
    case "incomplete":
      return "text-gray-600";
    default:
      return "text-gray-600";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "canceled":
      return "Canceled";
    case "past_due":
      return "Past Due";
    case "incomplete":
      return "Incomplete";
    default:
      return status;
  }
}
