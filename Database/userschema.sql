CREATE TABLE users (
    uid TEXT PRIMARY KEY DEFAULT gen_random_uuid(),  -- system-generated user ID
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    bio TEXT,
    institution TEXT,
    role TEXT,  -- e.g., student, teacher, developer
    avatar TEXT,
    auth_provider TEXT NOT NULL,  -- e.g., email/password, google
    is_admin BOOLEAN DEFAULT FALSE,
    is_moderator BOOLEAN DEFAULT FALSE,
    moderator_id TEXT,
    current_plan TEXT,
    location TEXT,
    study_domain TEXT,
    interests TEXT[],  -- array of strings
  
);


ALTER TABLE users
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
