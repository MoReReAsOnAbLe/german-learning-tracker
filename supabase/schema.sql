-- Deutsch Tracker — Supabase schema
-- Run this once in the Supabase SQL Editor for your project.

CREATE TABLE user_data (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings        jsonb DEFAULT '{}' NOT NULL,
  videos          jsonb DEFAULT '{}' NOT NULL,
  watch_sessions  jsonb DEFAULT '[]' NOT NULL,
  daily_log       jsonb DEFAULT '{}' NOT NULL,
  channels        jsonb DEFAULT '{}' NOT NULL,
  meta            jsonb DEFAULT '{}' NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security so users can only access their own row
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their data" ON user_data
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
