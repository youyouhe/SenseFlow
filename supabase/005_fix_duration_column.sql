-- Fix duration column to accept decimal values
-- Migration script to change INTEGER to DECIMAL(10,2)

-- Drop existing default constraint if any
ALTER TABLE sf_materials ALTER COLUMN duration DROP DEFAULT;

-- Change the column type from INTEGER to DECIMAL(10,2)
ALTER TABLE sf_materials ALTER COLUMN duration TYPE DECIMAL(10,2) USING duration::DECIMAL(10,2);

-- Set a reasonable default
ALTER TABLE sf_materials ALTER COLUMN duration SET DEFAULT 0.00;

-- Update any existing integer values to decimal format (optional)
UPDATE sf_materials SET duration = duration::DECIMAL(10,2) WHERE duration IS NOT NULL;