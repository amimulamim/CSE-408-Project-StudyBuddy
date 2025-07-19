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
ADD COLUMN raw_source TEXT;

ALTER TABLE content_items
ADD COLUMN collection_name TEXT NOT NULL DEFAULT '';

-- Migration: Add length column to content_items table
-- Date: 2025-01-20
-- Description: Add length field to track content length (short, medium, long) for proper versioning

-- Add the length column
ALTER TABLE content_items 
ADD COLUMN length VARCHAR(10);

-- Update existing records to have 'medium' as default length
UPDATE content_items 
SET length = 'medium' 
WHERE length IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN content_items.length IS 'Content length: short, medium, or long';
