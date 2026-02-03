-- Migration: Add video_folder_url and notion_page_id to students table
-- Purpose: Store Google Drive folder links and Notion page IDs for data migration

-- Add video_folder_url column for Google Drive video folder links
ALTER TABLE students ADD COLUMN IF NOT EXISTS video_folder_url TEXT;

-- Add notion_page_id column to track migrated Notion pages (prevents duplicates)
ALTER TABLE students ADD COLUMN IF NOT EXISTS notion_page_id TEXT UNIQUE;

-- Add index for notion_page_id lookups during migration
CREATE INDEX IF NOT EXISTS idx_students_notion_page_id ON students(notion_page_id);

-- Comment on columns for documentation
COMMENT ON COLUMN students.video_folder_url IS 'Google Drive folder URL containing student performance videos';
COMMENT ON COLUMN students.notion_page_id IS 'Original Notion page ID for migration tracking';
