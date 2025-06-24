CREATE TABLE user_collections (
    user_id TEXT NOT NULL,
    collection_name TEXT NOT NULL,
    full_collection_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, collection_name),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
);