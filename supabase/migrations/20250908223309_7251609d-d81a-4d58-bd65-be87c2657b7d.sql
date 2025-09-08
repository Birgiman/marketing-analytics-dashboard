-- Add company and address fields to profiles table
ALTER TABLE public.profiles ADD COLUMN company_name text;
ALTER TABLE public.profiles ADD COLUMN company_instagram text;
ALTER TABLE public.profiles ADD COLUMN address text;
ALTER TABLE public.profiles ADD COLUMN city text;
ALTER TABLE public.profiles ADD COLUMN state text;
ALTER TABLE public.profiles ADD COLUMN zip_code text;
ALTER TABLE public.profiles ADD COLUMN country text DEFAULT 'Brasil';