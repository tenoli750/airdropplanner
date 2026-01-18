-- Create blog_posts table for Supabase
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  images TEXT[],
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read blog posts
CREATE POLICY "Anyone can read blog posts" ON blog_posts
  FOR SELECT USING (true);

-- Policy: Only the author can insert their own posts
CREATE POLICY "Users can insert their own posts" ON blog_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Policy: Only the author can update their own posts
CREATE POLICY "Users can update their own posts" ON blog_posts
  FOR UPDATE USING (auth.uid() = author_id);

-- Policy: Only the author can delete their own posts
CREATE POLICY "Users can delete their own posts" ON blog_posts
  FOR DELETE USING (auth.uid() = author_id);
