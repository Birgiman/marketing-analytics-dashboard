-- Add new fields to whatsapp_groups table based on Evolution API response
ALTER TABLE whatsapp_groups 
ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_owner TEXT,
ADD COLUMN IF NOT EXISTS group_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS group_description TEXT;