-- Row Level Security Policies Update
-- Since we're using local UUID without Supabase Auth, simplify policies

-- Insert chunks for own materials (simplified)
DROP POLICY IF EXISTS "Users can insert chunks for their materials" ON sf_chunks;
CREATE POLICY "Users can insert chunks for their materials" ON sf_chunks FOR INSERT WITH CHECK (true);

-- Insert analytics for own materials (simplified)
DROP POLICY IF EXISTS "Users can insert analytics for their materials" ON sf_material_analytics;
CREATE POLICY "Users can insert analytics for their materials" ON sf_material_analytics FOR INSERT WITH CHECK (true);
