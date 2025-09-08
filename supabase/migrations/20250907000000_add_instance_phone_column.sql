-- Add instance_phone column to whatsapp_instances table
ALTER TABLE whatsapp_instances 
ADD COLUMN instance_phone TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN whatsapp_instances.instance_phone IS 'Phone number associated with the WhatsApp instance for participant validation';