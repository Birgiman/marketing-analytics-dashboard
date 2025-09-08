-- Create safe admin check function based on email (bypass RLS completely)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.email() = 'admin@liveshop.com';
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- Drop existing problematic policies 
DROP POLICY IF EXISTS "Users and privileged can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and privileged can update profiles" ON public.profiles;

-- Create simple and safe RLS policies
CREATE POLICY "Users can view own profile, admin can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR public.is_admin_user()
);

CREATE POLICY "Users can update own profile, admin can update all"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = user_id OR public.is_admin_user()
);