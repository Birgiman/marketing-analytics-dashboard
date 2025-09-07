-- Add monitoring field to whatsapp_groups table
ALTER TABLE whatsapp_groups 
ADD COLUMN monitoring BOOLEAN DEFAULT true;

-- Update existing groups to be monitored by default
UPDATE whatsapp_groups 
SET monitoring = true 
WHERE monitoring IS NULL;