/**
 * chat-history.ts
 * Abstraksi penyimpanan riwayat percakapan TemuData AI.
 *
 * Strategi:
 *   - User TAMU  (user === null) → LocalStorage (persistent)
 *   - User LOGIN (user !== null) → Supabase (maks 20 sesi/user)
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import type { Pesan } from "./llm";
import type { RoleId } from "./vitality-data";

// ─────────────────────────────────────────────────────────────────────────────
// Tipe data
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  userId: string | null; // null = tamu
  title: string;
  roleId: RoleId;
  kawasanId: string | null;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage helpers (untuk tamu)
// ─────────────────────────────────────────────────────────────────────────────

const LS_SESSIONS_KEY = "titiktemu_chat_sessions";
const LS_MESSAGES_PREFIX = "titiktemu_chat_msgs_";
const MAX_GUEST_SESSIONS = 20;

function lsGetSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(LS_SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

function lsSetSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // Tangani QuotaExceededError dengan menghapus sesi terlama
    const trimmed = sessions.slice(-MAX_GUEST_SESSIONS);
    localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(trimmed));
  }
}

function lsGetMessages(sessionId: string): Pesan[] {
  try {
    const raw = localStorage.getItem(LS_MESSAGES_PREFIX + sessionId);
    return raw ? (JSON.parse(raw) as Pesan[]) : [];
  } catch {
    return [];
  }
}

function lsSetMessages(sessionId: string, messages: Pesan[]) {
  try {
    localStorage.setItem(LS_MESSAGES_PREFIX + sessionId, JSON.stringify(messages));
  } catch {
    // Jika storage penuh, coba hapus 5 pesan terlama
    const trimmed = messages.slice(-50);
    localStorage.setItem(LS_MESSAGES_PREFIX + sessionId, JSON.stringify(trimmed));
  }
}

function lsDeleteSession(sessionId: string) {
  const sessions = lsGetSessions().filter((s) => s.id !== sessionId);
  lsSetSessions(sessions);
  localStorage.removeItem(LS_MESSAGES_PREFIX + sessionId);
}

function generateId(): string {
  return crypto.randomUUID();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Buat sesi baru.
 * @param userId - null untuk tamu, UUID string untuk user login.
 */
export async function createSession(
  userId: string | null,
  roleId: RoleId,
  kawasanId: string | null,
  title: string = "Percakapan Baru",
): Promise<ChatSession> {
  const now = new Date().toISOString();

  if (!userId || !isSupabaseConfigured) {
    // ── Tamu: simpan di LocalStorage ──
    const session: ChatSession = {
      id: generateId(),
      userId: null,
      title,
      roleId,
      kawasanId,
      createdAt: now,
      updatedAt: now,
    };

    const sessions = lsGetSessions();

    // Hapus sesi terlama jika sudah >= MAX
    const trimmed =
      sessions.length >= MAX_GUEST_SESSIONS
        ? sessions.slice(sessions.length - MAX_GUEST_SESSIONS + 1)
        : sessions;

    // Hapus messages sesi yang dihapus
    const removedIds = sessions.slice(0, sessions.length - trimmed.length).map((s) => s.id);
    removedIds.forEach((id) => localStorage.removeItem(LS_MESSAGES_PREFIX + id));

    lsSetSessions([...trimmed, session]);
    return session;
  }

  // ── User Login: simpan di Supabase ──
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_id: userId,
      title,
      role_id: roleId,
      kawasan_id: kawasanId,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Gagal membuat sesi chat: ${error?.message ?? "unknown"}`);
  }

  return dbRowToSession(data);
}

/**
 * Ambil semua sesi milik user, diurutkan dari terbaru.
 */
export async function loadSessions(userId: string | null): Promise<ChatSession[]> {
  if (!userId || !isSupabaseConfigured) {
    // Urutkan dari terbaru
    return lsGetSessions().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(MAX_GUEST_SESSIONS);

  if (error) {
    console.error("[loadSessions] Supabase error:", error.message);
    return [];
  }

  return (data ?? []).map(dbRowToSession);
}

/**
 * Ambil semua pesan dalam sebuah sesi.
 */
export async function loadMessages(sessionId: string, userId: string | null): Promise<Pesan[]> {
  if (!userId || !isSupabaseConfigured) {
    return lsGetMessages(sessionId);
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[loadMessages] Supabase error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    role: row.role as "user" | "assistant",
    content: row.content,
  }));
}

/**
 * Tambahkan satu pesan ke sesi yang sedang aktif.
 */
export async function appendMessage(
  sessionId: string,
  userId: string | null,
  pesan: Pesan,
): Promise<void> {
  if (!userId || !isSupabaseConfigured) {
    const current = lsGetMessages(sessionId);
    lsSetMessages(sessionId, [...current, pesan]);

    // Update updatedAt di LocalStorage session
    const sessions = lsGetSessions().map((s) =>
      s.id === sessionId ? { ...s, updatedAt: new Date().toISOString() } : s,
    );
    lsSetSessions(sessions);
    return;
  }

  const { error } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: pesan.role,
    content: pesan.content,
  });

  if (error) {
    console.error("[appendMessage] Supabase error:", error.message);
  }
  // Trigger di DB akan auto-update updated_at pada chat_sessions
}

/**
 * Hapus sebuah sesi dan semua pesannya.
 */
export async function deleteSession(sessionId: string, userId: string | null): Promise<void> {
  if (!userId || !isSupabaseConfigured) {
    lsDeleteSession(sessionId);
    return;
  }

  const { error } = await supabase.from("chat_sessions").delete().eq("id", sessionId);

  if (error) {
    console.error("[deleteSession] Supabase error:", error.message);
  }
}

/**
 * Rename judul sebuah sesi.
 */
export async function renameSession(
  sessionId: string,
  userId: string | null,
  newTitle: string,
): Promise<void> {
  const title = newTitle.trim().slice(0, 80) || "Percakapan Baru";

  if (!userId || !isSupabaseConfigured) {
    const sessions = lsGetSessions().map((s) => (s.id === sessionId ? { ...s, title } : s));
    lsSetSessions(sessions);
    return;
  }

  const { error } = await supabase.from("chat_sessions").update({ title }).eq("id", sessionId);

  if (error) {
    console.error("[renameSession] Supabase error:", error.message);
  }
}

/**
 * Auto-generate judul sesi dari pesan pertama user (maks 50 karakter).
 */
export function generateSessionTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  return trimmed.length > 50 ? trimmed.slice(0, 47) + "…" : trimmed;
}

/**
 * Kelompokkan sesi berdasarkan tanggal (untuk tampilan sidebar).
 */
export function groupSessionsByDate(sessions: ChatSession[]): {
  label: string;
  items: ChatSession[];
}[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);

  const groups: Record<string, ChatSession[]> = {
    "Hari ini": [],
    Kemarin: [],
    "Minggu ini": [],
    Lainnya: [],
  };

  for (const s of sessions) {
    const d = new Date(s.updatedAt);
    if (d >= today) {
      groups["Hari ini"].push(s);
    } else if (d >= yesterday) {
      groups["Kemarin"].push(s);
    } else if (d >= lastWeek) {
      groups["Minggu ini"].push(s);
    } else {
      groups["Lainnya"].push(s);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function dbRowToSession(row: Record<string, unknown>): ChatSession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    roleId: row.role_id as RoleId,
    kawasanId: (row.kawasan_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
