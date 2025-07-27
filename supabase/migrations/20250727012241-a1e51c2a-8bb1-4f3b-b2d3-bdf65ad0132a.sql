-- Create bills table to store LegiScan data
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legiscan_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sponsor_name TEXT NOT NULL,
  sponsor_party TEXT NOT NULL,
  sponsor_state TEXT NOT NULL,
  introduced_date DATE NOT NULL,
  last_action TEXT,
  last_action_date DATE,
  estimated_decision_date DATE,
  passing_likelihood INTEGER DEFAULT 0 CHECK (passing_likelihood >= 0 AND passing_likelihood <= 100),
  status TEXT NOT NULL DEFAULT 'introduced',
  chamber TEXT NOT NULL,
  document_url TEXT,
  raw_legiscan_data JSONB,
  gemini_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock predictions table
CREATE TABLE public.stock_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  predicted_direction TEXT NOT NULL CHECK (predicted_direction IN ('up', 'down')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_predictions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since this is public legislative data)
CREATE POLICY "Bills are viewable by everyone" 
ON public.bills 
FOR SELECT 
USING (true);

CREATE POLICY "Stock predictions are viewable by everyone" 
ON public.stock_predictions 
FOR SELECT 
USING (true);

-- Create policies for system/admin operations (for edge functions)
CREATE POLICY "System can manage bills" 
ON public.bills 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "System can manage stock predictions" 
ON public.stock_predictions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_bills_legiscan_id ON public.bills(legiscan_id);
CREATE INDEX idx_bills_introduced_date ON public.bills(introduced_date);
CREATE INDEX idx_bills_passing_likelihood ON public.bills(passing_likelihood);
CREATE INDEX idx_bills_status ON public.bills(status);
CREATE INDEX idx_stock_predictions_bill_id ON public.stock_predictions(bill_id);
CREATE INDEX idx_stock_predictions_symbol ON public.stock_predictions(symbol);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();