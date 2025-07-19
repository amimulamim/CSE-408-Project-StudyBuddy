-- ===================================================================
-- FINAL CONTENT VERSIONING DATABASE SETUP
-- Run this SQL script in your cloud database
-- This is the complete and final version - no other SQL files needed
-- ===================================================================

-- 1. Add versioning columns to existing content_items table
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS parent_content_id UUID DEFAULT NULL;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT TRUE;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS modification_instructions TEXT DEFAULT NULL;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS modified_from_version INTEGER DEFAULT NULL;

-- 2. Create content_modifications table for tracking modification requests
CREATE TABLE IF NOT EXISTS content_modifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    modification_instructions TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_modifications_content_id ON content_modifications(content_id);
CREATE INDEX IF NOT EXISTS idx_content_modifications_created_at ON content_modifications(created_at);
CREATE INDEX IF NOT EXISTS idx_content_parent_content_id ON content_items(parent_content_id);
CREATE INDEX IF NOT EXISTS idx_content_version_number ON content_items(version_number);
CREATE INDEX IF NOT EXISTS idx_content_is_latest_version ON content_items(is_latest_version);

-- 4. Add foreign key constraint for parent_content_id (self-referencing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'content_items_parent_content_id_fkey'
        AND table_name = 'content_items'
    ) THEN
        ALTER TABLE content_items 
        ADD CONSTRAINT content_items_parent_content_id_fkey 
        FOREIGN KEY (parent_content_id) REFERENCES content_items(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Function to get all versions of a content item (FIXED VERSION)
CREATE OR REPLACE FUNCTION get_content_versions(base_content_id UUID)
RETURNS TABLE (
    id UUID,
    version_number INTEGER,
    content_url TEXT,
    topic TEXT,
    content_type TEXT,
    modification_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_latest_version BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE content_tree AS (
        -- Base case: find the root content (original version)
        SELECT c.id, c.version_number, c.content_url, c.topic, c.content_type, 
               c.modification_instructions, c.created_at, c.is_latest_version,
               c.parent_content_id
        FROM content_items c
        WHERE c.id = base_content_id AND c.parent_content_id IS NULL
        
        UNION ALL
        
        -- Find the original if we started with a version
        SELECT c.id, c.version_number, c.content_url, c.topic, c.content_type,
               c.modification_instructions, c.created_at, c.is_latest_version,
               c.parent_content_id
        FROM content_items c
        WHERE c.id = (
            SELECT COALESCE(ci.parent_content_id, ci.id)
            FROM content_items ci 
            WHERE ci.id = base_content_id
        ) AND c.parent_content_id IS NULL
    ),
    all_versions AS (
        -- Get the root content
        SELECT ct.id, ct.version_number, ct.content_url, ct.topic, ct.content_type,
               ct.modification_instructions, ct.created_at, ct.is_latest_version
        FROM content_tree ct
        WHERE ct.parent_content_id IS NULL
        
        UNION ALL
        
        -- Get all child versions (FIXED: qualified column reference)
        SELECT c.id, c.version_number, c.content_url, c.topic, c.content_type,
               c.modification_instructions, c.created_at, c.is_latest_version
        FROM content_items c
        INNER JOIN content_tree ct ON c.parent_content_id = ct.id OR 
                                      c.parent_content_id IN (
                                          SELECT ct2.id FROM content_tree ct2 WHERE ct2.parent_content_id IS NULL
                                      )
    )
    SELECT DISTINCT av.id, av.version_number, av.content_url, av.topic, av.content_type,
           av.modification_instructions, av.created_at, av.is_latest_version
    FROM all_versions av
    ORDER BY av.version_number;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to get modification history for a content item
CREATE OR REPLACE FUNCTION get_modification_history(base_content_id UUID)
RETURNS TABLE (
    id UUID,
    content_id UUID,
    modification_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    content_topic TEXT,
    version_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE version_tree AS (
        -- Start with the base content
        SELECT c.id as content_id, c.topic, 1 as level
        FROM content_items c
        WHERE c.id = base_content_id
        
        UNION ALL
        
        -- Find all child versions
        SELECT c.id as content_id, c.topic, vt.level + 1
        FROM content_items c
        INNER JOIN version_tree vt ON c.parent_content_id = vt.content_id
    )
    SELECT DISTINCT cm.id, cm.content_id, cm.modification_instructions, cm.created_at,
           c.topic as content_topic, c.version_number
    FROM content_modifications cm
    INNER JOIN version_tree vt ON cm.content_id = vt.content_id
    INNER JOIN content_items c ON cm.content_id = c.id
    ORDER BY cm.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to handle automatic version management when content is updated
CREATE OR REPLACE FUNCTION create_content_version()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an update (not insert) and version-related fields changed
    IF TG_OP = 'UPDATE' AND (
        OLD.content_url != NEW.content_url OR 
        OLD.modification_instructions IS DISTINCT FROM NEW.modification_instructions
    ) THEN
        -- Update all previous versions of this content to not be latest
        UPDATE content_items 
        SET is_latest_version = FALSE 
        WHERE (id = NEW.parent_content_id OR parent_content_id = NEW.parent_content_id OR id = NEW.id)
        AND id != NEW.id;
        
        -- Set the new version as latest
        NEW.is_latest_version = TRUE;
        
        -- Increment version number
        IF NEW.parent_content_id IS NOT NULL THEN
            -- Get the highest version number in the version chain
            SELECT COALESCE(MAX(version_number), 0) + 1 
            INTO NEW.version_number
            FROM content_items 
            WHERE parent_content_id = NEW.parent_content_id OR id = NEW.parent_content_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for automatic versioning
DROP TRIGGER IF EXISTS content_versioning_trigger ON content_items;
CREATE TRIGGER content_versioning_trigger
    BEFORE UPDATE ON content_items
    FOR EACH ROW
    EXECUTE FUNCTION create_content_version();

-- 9. Update existing content to ensure proper versioning state
UPDATE content_items 
SET version_number = COALESCE(version_number, 1),
    is_latest_version = COALESCE(is_latest_version, TRUE),
    parent_content_id = NULL
WHERE version_number IS NULL OR version_number = 0 OR is_latest_version IS NULL;

-- 10. Verification queries (optional - you can run these to verify setup)
-- SELECT 'Content versioning setup completed successfully!' as status;
-- SELECT COUNT(*) as total_content_items FROM content_items;
-- SELECT COUNT(*) as total_modifications FROM content_modifications;

-- ===================================================================
-- SETUP COMPLETE!
-- Your database now supports:
-- 1. Content versioning with automatic version tracking
-- 2. Content modification requests with history
-- 3. Multiple versions of the same content
-- 4. Version navigation and management
-- ===================================================================
