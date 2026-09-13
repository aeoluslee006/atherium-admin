-- Sticky note dimensions for resizable board notes
ALTER TABLE pharma_notes
  ADD COLUMN IF NOT EXISTS width integer NOT NULL DEFAULT 140,
  ADD COLUMN IF NOT EXISTS height integer NOT NULL DEFAULT 100;

UPDATE pharma_notes SET width = 140 WHERE width IS NULL;
UPDATE pharma_notes SET height = 100 WHERE height IS NULL;
