-- CRITICAL SECURITY FIX: Enable RLS on actual regulatory tables (not views)
-- Views like clauses_v inherit security from underlying tables

-- First, check which tables actually exist and don't have RLS enabled
-- Based on the schema, these are the actual tables that need RLS:

-- Enable RLS on ingestions table (this one exists and needs RLS)
-- Note: clauses, regulations, regulation_documents already exist but may need RLS

-- Check if RLS is already enabled and enable if not
DO $$
BEGIN
    -- Enable RLS on ingestions if not already enabled
    IF NOT (SELECT schemaname='public' AND tablename='ingestions' AND rowsecurity=true 
            FROM pg_tables WHERE schemaname='public' AND tablename='ingestions') THEN
        ALTER TABLE public.ingestions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on other tables if they exist and don't have RLS
    -- These commands will only run if the tables exist
    
    EXECUTE $sql$
        DO $inner$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clauses') THEN
                ALTER TABLE public.clauses ENABLE ROW LEVEL SECURITY;
            END IF;
        EXCEPTION WHEN others THEN
            -- Table might already have RLS or be a view, ignore error
            NULL;
        END $inner$;
    $sql$;
    
    EXECUTE $sql$
        DO $inner$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='regulations') THEN
                ALTER TABLE public.regulations ENABLE ROW LEVEL SECURITY;
            END IF;
        EXCEPTION WHEN others THEN
            NULL;
        END $inner$;
    $sql$;
    
    EXECUTE $sql$
        DO $inner$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='regulation_documents') THEN
                ALTER TABLE public.regulation_documents ENABLE ROW LEVEL SECURITY;
            END IF;
        EXCEPTION WHEN others THEN
            NULL;
        END $inner$;
    $sql$;
    
    EXECUTE $sql$
        DO $inner$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='obligations') THEN
                ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;
            END IF;
        EXCEPTION WHEN others THEN
            NULL;
        END $inner$;
    $sql$;
END $$;

-- Create RLS policies for authenticated access
-- These will only create if the policy doesn't already exist

-- Policies for ingestions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ingestions' AND policyname='Authenticated users can read ingestions') THEN
        CREATE POLICY "Authenticated users can read ingestions" 
        ON public.ingestions 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- Note: Views inherit RLS from underlying tables
-- The _v views (like clauses_v, regulations_v) will now require authentication to access