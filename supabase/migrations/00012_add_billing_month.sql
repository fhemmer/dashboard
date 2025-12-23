-- Add billing_month column for annual subscription renewal tracking
-- For monthly expenditures, this will be NULL
-- For yearly expenditures, this specifies the month (1-12) when renewal occurs

ALTER TABLE public.expenditure_sources
ADD COLUMN billing_month integer CHECK (billing_month IS NULL OR (billing_month >= 1 AND billing_month <= 12));

-- Add comment for documentation
COMMENT ON COLUMN public.expenditure_sources.billing_month IS 'Month of renewal for yearly subscriptions (1=January, 12=December). NULL for monthly subscriptions.';
