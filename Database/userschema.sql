CREATE TABLE users (
    uid TEXT PRIMARY KEY DEFAULT gen_random_uuid(),  -- system-generated user ID
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    bio TEXT,
    institution TEXT,
    role TEXT,  -- e.g., student, teacher, developer
    photo_url TEXT,
    auth_provider TEXT NOT NULL,  -- e.g., email/password, google
    is_admin BOOLEAN DEFAULT FALSE,
    is_moderator BOOLEAN DEFAULT FALSE,
    moderator_id TEXT,
    current_plan TEXT,
    location TEXT,
    study_domain TEXT,
    interests TEXT[],  -- array of strings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
