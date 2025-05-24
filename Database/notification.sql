CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL REFERENCES users(uid) ON DELETE SET NULL,
    recipient_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);


-- 1. Drop the old column (if it exists)
ALTER TABLE notifications DROP COLUMN IF EXISTS "created_at";
-- 2. Add the new column with correct type
ALTER TABLE notifications
ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();