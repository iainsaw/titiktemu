-- Migration: Add contact columns to team_members
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS telp TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
