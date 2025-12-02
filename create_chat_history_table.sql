-- Create table for Chat History
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying by user_phone and created_at
CREATE INDEX IF NOT EXISTS idx_chat_history_user_phone ON chat_history(user_phone);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_phone_created_at ON chat_history(user_phone, created_at DESC);

-- Enable Row Level Security
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Policies: Allow public access for chat functionality
CREATE POLICY "Public can insert chat_history" ON chat_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view chat_history" ON chat_history FOR SELECT USING (true);
CREATE POLICY "Admin can do all on chat_history" ON chat_history FOR ALL USING (true);
