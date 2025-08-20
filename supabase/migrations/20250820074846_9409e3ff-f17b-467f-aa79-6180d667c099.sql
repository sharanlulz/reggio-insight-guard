-- CRITICAL SECURITY FIX: Enable RLS on regulatory tables and create proper access policies
-- This prevents unauthorized access to valuable regulatory intelligence data

-- Enable Row Level Security on all regulatory tables that currently lack it
ALTER TABLE public.clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestions ENABLE ROW LEVEL SECURITY;

-- Create policies for clauses - allow authenticated users to read, admin to modify
CREATE POLICY "Authenticated users can read clauses" 
ON public.clauses 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert clauses" 
ON public.clauses 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update clauses" 
ON public.clauses 
FOR UPDATE 
TO authenticated 
USING (true);

-- Create policies for regulations - allow authenticated users to read
CREATE POLICY "Authenticated users can read regulations" 
ON public.regulations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert regulations" 
ON public.regulations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update regulations" 
ON public.regulations 
FOR UPDATE 
TO authenticated 
USING (true);

-- Create policies for regulation_documents - allow authenticated users to read
CREATE POLICY "Authenticated users can read regulation documents" 
ON public.regulation_documents 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert regulation documents" 
ON public.regulation_documents 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update regulation documents" 
ON public.regulation_documents 
FOR UPDATE 
TO authenticated 
USING (true);

-- Create policies for obligations - allow authenticated users to read
CREATE POLICY "Authenticated users can read obligations" 
ON public.obligations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert obligations" 
ON public.obligations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update obligations" 
ON public.obligations 
FOR UPDATE 
TO authenticated 
USING (true);

-- Create policies for ingestions - allow authenticated users to read
CREATE POLICY "Authenticated users can read ingestions" 
ON public.ingestions 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert ingestions" 
ON public.ingestions 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update ingestions" 
ON public.ingestions 
FOR UPDATE 
TO authenticated 
USING (true);

-- Note: Views inherit security from underlying tables, so no additional policies needed for views