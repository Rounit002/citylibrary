-- Add columns to support tracking of previous-month due paid entries
-- Safe to run multiple times
ALTER TABLE IF EXISTS student_membership_history
  ADD COLUMN IF NOT EXISTS prev_due_paid BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS student_membership_history
  ADD COLUMN IF NOT EXISTS source_month TEXT; -- stores 'YYYY-MM' of the original month whose due was paid

