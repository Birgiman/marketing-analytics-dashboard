-- Ensure admin check function exists and is executable by authenticated users
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

-- Drop the problematic recursive policies that reference profiles within profiles
DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users and admins can update profiles" ON public.profiles;

-- Keep existing safe policies; re-assert them to be correct (idempotent guard via drop+create)
-- Recreate only if missing to avoid duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view own profile, admin can view all'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view own profile, admin can view all"
      ON public.profiles
      FOR SELECT
      USING (
        auth.uid() = user_id OR public.is_admin_user()
      );
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own profile, admin can update all'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can update own profile, admin can update all"
      ON public.profiles
      FOR UPDATE
      USING (
        auth.uid() = user_id OR public.is_admin_user()
      );
    $$;
  END IF;
END $$;