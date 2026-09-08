-- Migration: chat_sessions & chat_messages untuk fitur riwayat percakapan TemuData AI
-- Titik Temu — Supabase Auth integration
-- Dibuat: 2026-09-09

-- ─────────────────────────────────────────────────
-- 1. Tabel: chat_sessions (metadata sesi percakapan)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Percakapan Baru',
  role_id     TEXT NOT NULL DEFAULT 'investor' CHECK (role_id IN ('investor', 'pemerintah', 'umkm')),
  kawasan_id  TEXT,           -- ID kawasan yang dipilih saat sesi dibuat (opsional)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: ambil sesi per user, urutkan terbaru
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
  ON public.chat_sessions (user_id, updated_at DESC);

-- ─────────────────────────────────────────────────
-- 2. Tabel: chat_messages (isi pesan per sesi)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: ambil semua pesan dalam satu sesi, urut kronologis
CREATE INDEX IF NOT EXISTS idx_chat_messages_session
  ON public.chat_messages (session_id, created_at ASC);

-- ─────────────────────────────────────────────────
-- 3. Row Level Security
-- ─────────────────────────────────────────────────
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy chat_sessions: user hanya bisa CRUD data miliknya sendiri
DROP POLICY IF EXISTS "Users manage own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users manage own chat sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy chat_messages: user bisa CRUD pesan di sesi miliknya
DROP POLICY IF EXISTS "Users manage own chat messages" ON public.chat_messages;
CREATE POLICY "Users manage own chat messages" ON public.chat_messages
  FOR ALL USING (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Service role full access (untuk server-side functions)
DROP POLICY IF EXISTS "Service role full access to chat_sessions" ON public.chat_sessions;
CREATE POLICY "Service role full access to chat_sessions" ON public.chat_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to chat_messages" ON public.chat_messages;
CREATE POLICY "Service role full access to chat_messages" ON public.chat_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────
-- 4. Grant permissions
-- ─────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
GRANT ALL ON public.chat_messages TO service_role;

-- ─────────────────────────────────────────────────
-- 5. Trigger: auto-update updated_at pada chat_sessions
--    setiap kali ada pesan baru masuk ke sesi tersebut
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_sessions
  SET updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_chat_message ON public.chat_messages;
CREATE TRIGGER on_new_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_session_timestamp();

-- ─────────────────────────────────────────────────
-- 6. Fungsi pembatas: maks 20 sesi per user
--    Dipanggil saat INSERT ke chat_sessions
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_max_chat_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Hapus sesi terlama jika sudah ada >= 20 sesi untuk user ini
  DELETE FROM public.chat_sessions
  WHERE id IN (
    SELECT id FROM public.chat_sessions
    WHERE user_id = NEW.user_id
    ORDER BY updated_at ASC
    OFFSET 19  -- pertahankan 19 sesi terbaru, hapus sisanya
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_session_limit ON public.chat_sessions;
CREATE TRIGGER enforce_session_limit
  BEFORE INSERT ON public.chat_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.enforce_max_chat_sessions();
