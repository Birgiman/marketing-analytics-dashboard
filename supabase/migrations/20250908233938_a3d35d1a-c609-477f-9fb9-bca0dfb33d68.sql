-- Add is_admin to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Backfill email values from auth.users when missing
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND (p.email IS NULL OR p.email = '');

-- Mark admin user by email
UPDATE public.profiles p
SET is_admin = true
FROM auth.users u
WHERE p.user_id = u.id AND u.email = 'admin@liveshop.com';

-- Create admin policies to view and update all profiles
CREATE POLICY IF NOT EXISTS "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles ap
    WHERE ap.user_id = auth.uid() AND ap.is_admin = true
  )
);

CREATE POLICY IF NOT EXISTS "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles ap
    WHERE ap.user_id = auth.uid() AND ap.is_admin = true
  )
);
