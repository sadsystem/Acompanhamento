-- Migration: Add vehicles table and vehicleId to routes
-- Date: 2025-03-09

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  model TEXT,
  year INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add vehicleId column to routes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routes' AND column_name='vehicle_id') THEN
    ALTER TABLE routes ADD COLUMN vehicle_id VARCHAR;
    ALTER TABLE routes ADD CONSTRAINT routes_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);
  END IF;
END $$;

-- Add some default vehicles
INSERT INTO vehicles (plate, model, year, active) VALUES 
  ('PDO-0000', 'Não especificado', 2024, true),
  ('SNN-0000', 'Não especificado', 2024, true),
  ('KIF-0000', 'Não especificado', 2024, true)
ON CONFLICT (id) DO NOTHING;

COMMIT;
