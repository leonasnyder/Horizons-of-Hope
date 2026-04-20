-- ============================================================
-- Horizons of Hope — scope `categories` per user
--
-- The original schema gave every user a shared `categories` table
-- with a global UNIQUE(name) constraint, so edits from one account
-- (or from a test/second account) showed up in every account.
--
-- This migration:
--   1. Adds a nullable `user_id` column (so existing rows keep working)
--   2. Drops the old UNIQUE(name) constraint
--   3. Adds a UNIQUE(user_id, name) constraint so each user has their
--      own namespace for category names
--
-- Legacy rows (user_id IS NULL) are still readable, but the API now
-- auto-claims them to the first user that fetches /api/categories
-- so they stop bleeding between accounts.
--
-- Run this ONCE in Supabase Dashboard → SQL Editor.
-- Safe to re-run: every statement uses IF (NOT) EXISTS.
-- ============================================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the old global UNIQUE(name) constraint. The constraint name
-- postgres auto-generates is `categories_name_key`.
ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_name_key;

-- Add a per-user UNIQUE(user_id, name) constraint. NULL user_id rows
-- (legacy) are allowed to collide — the API will claim them to a user
-- on next fetch, after which the constraint starts enforcing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_user_id_name_key'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_user_id_name_key UNIQUE (user_id, name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
