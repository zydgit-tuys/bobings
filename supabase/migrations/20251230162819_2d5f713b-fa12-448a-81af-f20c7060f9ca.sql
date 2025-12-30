-- Create app settings table for storing admin password
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read (needed for password verification)
CREATE POLICY "Allow public read" ON public.app_settings
FOR SELECT USING (true);

-- Create policy for public update (for setting password)
CREATE POLICY "Allow public update" ON public.app_settings
FOR ALL USING (true) WITH CHECK (true);

-- Insert default admin password (default: admin123 - should be changed)
INSERT INTO public.app_settings (setting_key, setting_value) 
VALUES ('admin_password', 'admin123');

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();