-- Add notes column to expenditure_sources table
ALTER TABLE public.expenditure_sources
ADD COLUMN notes text;
