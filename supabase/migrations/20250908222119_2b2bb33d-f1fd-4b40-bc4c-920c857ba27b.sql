-- Add status field to profiles table for user approval workflow
ALTER TABLE public.profiles ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disabled'));

-- Create index for faster status queries
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- Update existing users to approved status (so they don't get locked out)
UPDATE public.profiles SET status = 'approved' WHERE status = 'pending';