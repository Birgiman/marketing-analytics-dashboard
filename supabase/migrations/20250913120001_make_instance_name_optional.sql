-- Make instance_name optional in live_campaigns table
-- This fixes the schema cache issue where the column might not exist yet

DO $$
BEGIN
    -- Check if the live_campaigns table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'live_campaigns') THEN
        -- Check if instance_name column exists and make it nullable
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'live_campaigns' AND column_name = 'instance_name') THEN
            ALTER TABLE public.live_campaigns ALTER COLUMN instance_name DROP NOT NULL;
        ELSE
            -- Add the column if it doesn't exist
            ALTER TABLE public.live_campaigns ADD COLUMN instance_name TEXT;
        END IF;
    END IF;
END $$;

-- Update comment
COMMENT ON COLUMN public.live_campaigns.instance_name IS 'WhatsApp instance name (optional, for multi-instance support)';