/*
# Add display_order to meals

## Purpose
Preserve the original reading order of imported nutrition plans.
When a parser extracts meals from a document, they come out in document
order. Previously the app sorted only by created_at, which is identical
for every row in a single bulk INSERT, making PostgreSQL's tie-breaking
non-deterministic and scrambling the nutritionist's original structure.

## Changes

### Modified table: meals
- New column: display_order (integer, nullable)
  Stores the 0-based position of the meal within the imported document.
  NULL for manually-added meals; they sort after imported meals when
  NULLS LAST ordering is applied.

## Index
- meals_display_order_idx on (user_id, display_order)
  Allows efficient ORDER BY display_order queries scoped to a single user.

## Notes
1. Column is nullable — existing rows are unaffected and will sort
   after rows that have an explicit display_order (NULLS LAST).
2. No RLS changes needed — the existing per-user policies already
   govern this table and cover the new column automatically.
*/

ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS display_order integer;

CREATE INDEX IF NOT EXISTS meals_display_order_idx
  ON meals (user_id, display_order);
