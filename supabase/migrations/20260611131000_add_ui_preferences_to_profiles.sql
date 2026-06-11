-- Migration: add ui_preferences jsonb to profiles
-- created: 2026-06-11

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS ui_preferences jsonb DEFAULT '{}'::jsonb;

-- keep updated_at in sync via trigger if one exists; otherwise apps should set updated_at on writes
