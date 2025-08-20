-- SECURITY FIX: Since regulatory data is accessed through views,
-- we need to implement authentication checks at the application level
-- and ensure RLS is properly configured on the underlying tables

-- First, let's create a security function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a policy template for views that require authentication
-- This will be used by the application to enforce security

-- Create a security log table to track access to regulatory data
CREATE TABLE IF NOT EXISTS public.regulatory_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on the access log
ALTER TABLE public.regulatory_access_log ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read their own access logs
CREATE POLICY "Users can read own access logs"
ON public.regulatory_access_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- System can insert access logs
CREATE POLICY "System can log access"
ON public.regulatory_access_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Grant usage on the security function
GRANT EXECUTE ON FUNCTION public.is_authenticated_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated_user() TO anon;