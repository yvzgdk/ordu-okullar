-- Add infrastructure_plan column to institutions table
ALTER TABLE institutions
ADD COLUMN infrastructure_plan VARCHAR(50);

-- Add comment to explain the column
COMMENT ON COLUMN institutions.infrastructure_plan IS 'Altyapı planı (Uyumlaştırma 1, Uyumlaştırma 2, Uyumlaştırma 3, Yapılmayacak)';







