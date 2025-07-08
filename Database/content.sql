CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,

    content_url TEXT NOT NULL,
    image_preview TEXT,
    
    topic TEXT,
    content_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_items
ADD COLUMN raw_source TEXT
