interface SubscriptionStatus {
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

export type { SubscriptionStatus };