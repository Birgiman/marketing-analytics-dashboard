-- Create role enum if not exists
DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'superadmin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Add role column to profiles if not exists
DO $$
BEGIN
  ALTER TABLE public.profiles ADD COLUMN role public.app_role NOT NULL DEFAULT 'user';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END
$$;

-- Drop recursive policies to avoid infinite recursion
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can update profiles" ON public.profiles;

-- Create SECURITY DEFINER function to check role safely (bypass RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND role = _role
  );
$$;

-- Ensure authenticated users can execute the function
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Recreate safe RLS policies using the function
CREATE POLICY "Users and privileged can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
);

CREATE POLICY "Users and privileged can update profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin')
);

-- Migrate admin flags to roles if legacy column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    -- Set role=admin for any previous is_admin=true users (except the super admin below)
    UPDATE public.profiles SET role = 'admin' 
    WHERE is_admin = true AND user_id <> '3824daaa-f5b8-4fc8-ac9d-5d98db7eabfe';
  END IF;
END $$;

-- Ensure the test super admin account has correct role (by user_id provided)
UPDATE public.profiles p
SET role = 'superadmin', email = COALESCE(p.email, 'admin@liveshop.com')
WHERE p.user_id = '3824daaa-f5b8-4fc8-ac9d-5d98db7eabfe';

-- Drop legacy column if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN is_admin;
  END IF;
END $$;