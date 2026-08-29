-- Migration: user_profiles table untuk Role-Based Access Control
-- Dibuat untuk Titik Temu — Supabase Auth integration
-- AMAN dari SQL Injection: menggunakan parameterized queries via Supabase JS Client

-- 1. Buat tabel user_profiles (terhubung ke auth.users Supabase)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Pengguna hanya bisa membaca profil DIRINYA SENDIRI (bukan profil orang lain)
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- 4. Policy: Pengguna hanya bisa UPDATE profil DIRINYA SENDIRI (tidak bisa ubah role!)
DROP POLICY IF EXISTS "Users can update own profile (not role)" ON public.user_profiles;
CREATE POLICY "Users can update own profile (not role)" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid()));

-- 5. Service role bisa baca/tulis semua (untuk server functions)
DROP POLICY IF EXISTS "Service role full access" ON public.user_profiles;
CREATE POLICY "Service role full access" ON public.user_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Grant permissions
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

-- 7. Fungsi trigger: otomatis buat user_profiles saat user baru mendaftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, display_name)
  VALUES (
    NEW.id,
    'user', -- Default role = user biasa
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING; -- Idempotent: aman jika trigger dipanggil dua kali
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Pasang trigger ke auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- CARA MENAMBAH ADMIN:
-- Setelah user mendaftar, jalankan query ini di Supabase SQL Editor:
-- UPDATE public.user_profiles SET role = 'admin' WHERE id = '<user_uuid>';
-- ═══════════════════════════════════════════════════════════════
