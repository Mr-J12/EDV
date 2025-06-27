
-- Create a table to store Excel data with validation
CREATE TABLE public.excel_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  sheet_data JSONB NOT NULL,
  headers TEXT[] NOT NULL,
  row_count INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  validation_passed BOOLEAN NOT NULL DEFAULT true
);

-- Add Row Level Security (RLS) - making it public for now since no auth is implemented
ALTER TABLE public.excel_data ENABLE ROW LEVEL SECURITY;

-- Create policy that allows anyone to view data (since no auth is implemented)
CREATE POLICY "Anyone can view excel data" 
  ON public.excel_data 
  FOR SELECT 
  USING (true);

-- Create policy that allows anyone to insert data
CREATE POLICY "Anyone can insert excel data" 
  ON public.excel_data 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy that allows anyone to update data
CREATE POLICY "Anyone can update excel data" 
  ON public.excel_data 
  FOR UPDATE 
  USING (true);

-- Create policy that allows anyone to delete data
CREATE POLICY "Anyone can delete excel data" 
  ON public.excel_data 
  FOR DELETE 
  USING (true);
