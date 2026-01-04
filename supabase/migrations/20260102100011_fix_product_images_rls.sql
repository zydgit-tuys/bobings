-- ============================================
-- Fix RLS policies for product_images
-- ALIGNMENT: Match existing "Public Access" model of other tables
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted policies
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;
DROP POLICY IF EXISTS "Authenticated users can insert product images" ON product_images;
DROP POLICY IF EXISTS "Users can update their uploaded images" ON product_images;
DROP POLICY IF EXISTS "Users can delete their uploaded images" ON product_images;
-- Drop potentially created new policies from previous fix attempts
DROP POLICY IF EXISTS "Authenticated users can update product images" ON product_images;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON product_images;

-- Create permissive policies (Public Access) to match other tables
-- This ensures no friction during development/testing
CREATE POLICY "Allow public access" 
  ON product_images 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
