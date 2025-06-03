CREATE TABLE plans (
    id TEXT PRIMARY KEY,              -- e.g., 'premium_monthly'
    name TEXT NOT NULL,               -- e.g., 'Premium Monthly'
    price_cents INTEGER NOT NULL,     -- price in smallest currency unit (e.g., 49900 = 499 BDT)
    currency TEXT NOT NULL DEFAULT 'BDT',
    interval TEXT NOT NULL CHECK (interval IN ('monthly', 'yearly')),
    is_active BOOLEAN DEFAULT TRUE
);


CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES plans(id),
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,   -- null if still active
    cancel_at TIMESTAMPTZ,  -- scheduled cancellation (optional)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BDT',
    provider TEXT NOT NULL,                 -- e.g., 'sslcommerz'
    provider_payment_id TEXT,              -- e.g., transaction ID from provider
    status TEXT CHECK (status IN ('success', 'failed', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_payload JSONB NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);



