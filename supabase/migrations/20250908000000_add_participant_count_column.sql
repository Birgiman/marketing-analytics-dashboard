-- Add participant_count column to whatsapp_groups table
ALTER TABLE whatsapp_groups 
ADD COLUMN participant_count INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN whatsapp_groups.participant_count IS 'Number of participants in the group (cached from Evolution API)';