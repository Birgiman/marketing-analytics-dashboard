-- Add is_admin to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Mark admin user by email first (simpler approach)
UPDATE public.profiles p
SET is_admin = true, email = 'admin@liveshop.com'
WHERE p.user_id = '3824daaa-f5b8-4fc8-ac9d-5d98db7eabfe';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policies that allow admin access
CREATE POLICY "Users and admins can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles ap
    WHERE ap.user_id = auth.uid() AND ap.is_admin = true
  )
);

CREATE POLICY "Users and admins can update profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles ap
    WHERE ap.user_id = auth.uid() AND ap.is_admin = true
  )
);