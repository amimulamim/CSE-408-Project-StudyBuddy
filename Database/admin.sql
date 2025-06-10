-- Admin Module Database Schema
-- Execute this SQL to create admin-related tables

-- Admin Logs Table - Track all administrative actions
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_uid VARCHAR NOT NULL,
    action_type VARCHAR NOT NULL,
    target_uid VARCHAR,
    target_type VARCHAR NOT NULL,
    details TEXT,
    ip_address VARCHAR,
    user_agent VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for admin_logs
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_uid ON admin_logs(admin_uid);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_uid ON admin_logs(target_uid);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);

-- Notifications Table - Admin-managed user notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR PRIMARY KEY,
    recipient_uid VARCHAR NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    created_by VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_uid);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- System Stats Table - Store usage statistics
CREATE TABLE IF NOT EXISTS system_stats (
    id SERIAL PRIMARY KEY,
    stat_type VARCHAR NOT NULL CHECK (stat_type IN ('daily', 'weekly', 'monthly')),
    date VARCHAR NOT NULL,
    users_added INTEGER DEFAULT 0,
    content_generated INTEGER DEFAULT 0,
    quiz_generated INTEGER DEFAULT 0,
    content_uploaded INTEGER DEFAULT 0,
    chats_done INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stat_type, date)
);

-- Indexes for system_stats
CREATE INDEX IF NOT EXISTS idx_system_stats_date ON system_stats(date);
CREATE INDEX IF NOT EXISTS idx_system_stats_type ON system_stats(stat_type);

-- Comments
COMMENT ON TABLE admin_logs IS 'Audit log for all administrative actions';
COMMENT ON TABLE notifications IS 'Admin-managed notifications for users';
COMMENT ON TABLE system_stats IS 'System usage statistics aggregated by time period';

-- Sample data for testing (optional)
-- INSERT INTO system_stats (stat_type, date, users_added, content_generated, quiz_generated, content_uploaded, chats_done)
-- VALUES 
--     ('daily', '2025-06-01', 10, 25, 5, 15, 50),
--     ('daily', '2025-06-02', 8, 30, 7, 12, 45);
