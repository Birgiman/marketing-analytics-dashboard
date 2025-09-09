-- Drop all problematic recursive policies on profiles table
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can update profiles" ON public.profiles;

-- Ensure the admin function exists
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.email() = 'admin@liveshop.com';
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;