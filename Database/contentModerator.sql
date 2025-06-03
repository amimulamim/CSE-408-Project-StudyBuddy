CREATE TABLE moderator_profiles (
    moderator_id TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
    contents_modified INTEGER NOT NULL DEFAULT 0,
    quizzes_modified INTEGER NOT NULL DEFAULT 0,
    total_time_spent NUMERIC(6,2) DEFAULT 0  -- hours, up to 9999.99
);

CREATE TABLE moderator_domains (
    moderator_id TEXT REFERENCES moderator_profiles(moderator_id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    PRIMARY KEY (moderator_id, domain)
);
CREATE TABLE moderator_topics (
    moderator_id TEXT REFERENCES moderator_profiles(moderator_id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    PRIMARY KEY (moderator_id, topic)
);
CREATE TABLE moderator_quiz_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id TEXT REFERENCES moderator_profiles(moderator_id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id),
    modified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE moderator_content_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id TEXT REFERENCES moderator_profiles(moderator_id) ON DELETE CASCADE,
    content_id UUID REFERENCES content_items(id),
    modified_at TIMESTAMPTZ DEFAULT NOW()
);


