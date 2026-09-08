import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { SiteHeader } from "@/components/SiteHeader";
import { AiIcon } from "@/components/AiIcon";
import { AnimatedSection } from "@/components/AnimatedSection";
import { AuthModal } from "@/components/AuthModal";
import { ChatSidebar } from "@/components/ChatSidebar";
import { FollowUpChips } from "@/components/FollowUpChips";
import { konteksDashboard, konteksKawasan } from "@/lib/ai-konteks";
import {
  getAiInsight,
  sendAiChatStream,
  generateFollowUpChips,
  type Pesan,
} from "@/lib/llm";
import {
  createSession,
  loadSessions,
  loadMessages,
  appendMessage,
  deleteSession,
  renameSession,
  generateSessionTitle,
  type ChatSession,
} from "@/lib/chat-history";
import { useKawasans } from "@/hooks/useKawasans";
import { useAuth } from "@/contexts/AuthContext";
import {
  KAWASAN as STATIC_KAWASAN,
  ROLES,
  hitungSkor,
  type Kawasan,
  type RoleId,
} from "@/lib/vitality-data";
import { cn } from "@/lib/utils";

type Search = { peran?: RoleId; kawasan?: string };
const PERAN_VALID: RoleId[] = ["investor", "pemerintah", "umkm"];

export const Route = createFileRoute("/temudata")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    peran: PERAN_VALID.includes(search.peran as RoleId)
      ? (search.peran as RoleId)
      : undefined,
    kawasan: typeof search.kawasan === "string" ? search.kawasan : undefined,
  }),
  head: () => ({
    meta: [
      { title: "TemuData AI — Asisten Data Kawasan Transit" },
      {
        name: "description",
        content:
          "TemuData AI menggabungkan chat asisten dan penjelasan skor otomatis untuk 16 kawasan pilot Kota Bandung berbasis data dashboard Titik Temu.",
      },
      { property: "og:title", content: "TemuData AI — Titik Temu" },
      {
        property: "og:description",
        content:
          "Tanya apa saja tentang skor vitalitas transit, atau minta AI menjelaskan perbedaan skor per komponen kawasan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TemuDataAi,
});

// ─── Helper: format sapaan berdasarkan waktu ─────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

// ─── Tipe state pesan dengan streaming support ────────────────────────────────
interface PesanWithChips extends Pesan {
  chips?: string[];
  chipsLoading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
function TemuDataAi() {
  const { peran: peranAwal, kawasan: kawasanAwal } = Route.useSearch();
  const { user, signOut } = useAuth();
  const { kawasans } = useKawasans();

  // ── Role & kawasan ──
  const [role, setRole] = useState<RoleId>(peranAwal ?? "investor");
  const [selectedId, setSelectedId] = useState<string>(
    kawasanAwal ?? STATIC_KAWASAN[0].id,
  );

  // ── Auth modal ──
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // ── Sidebar ──
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Detect sm breakpoint for sidebar margin (sidebar pushes on desktop, overlays on mobile)
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 640px)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Session state ──
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);

  // ── Pesan state ──
  const [pesan, setPesan] = useState<PesanWithChips[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null); // text yg sedang distream
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const areaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const userId = user?.id ?? null;
  const displayName: string =
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || "";

  const terpilih: Kawasan =
    kawasans.find((k) => k.id === selectedId) ?? kawasans[0] ?? STATIC_KAWASAN[0];

  const konteks = konteksDashboard(role, kawasans.length ? kawasans : STATIC_KAWASAN, terpilih);

  // ── Load sessions on mount / user change ──
  useEffect(() => {
    loadSessions(userId).then((data) => {
      setSessions(data);
    });
  }, [userId]);

  // ── Auto-scroll ──
  useEffect(() => {
    areaRef.current?.scrollTo({
      top: areaRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [pesan, streamingText, loading]);

  // ── Focus input ──
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading, activeSession]);

  // ── Pilih sesi: load messages ──
  const handleSelectSession = useCallback(
    async (session: ChatSession) => {
      setActiveSession(session);
      setError("");
      setStreamingText(null);
      // Sync role & kawasan dari sesi
      setRole(session.roleId);
      if (session.kawasanId) setSelectedId(session.kawasanId);

      const msgs = await loadMessages(session.id, userId);
      setPesan(msgs);
      setSidebarOpen(false); // tutup sidebar di mobile setelah pilih
    },
    [userId],
  );

  // ── Buat sesi baru ──
  const handleNewChat = useCallback(async () => {
    // Batal jika sudah ada sesi aktif yang kosong
    if (activeSession && pesan.length === 0) {
      setSidebarOpen(false);
      return;
    }

    // Batalkan streaming yang sedang berjalan
    abortRef.current?.abort();

    const newSession = await createSession(userId, role, selectedId);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSession(newSession);
    setPesan([]);
    setStreamingText(null);
    setError("");
    setSidebarOpen(false);
  }, [userId, role, selectedId, activeSession, pesan.length]);

  // ── Hapus sesi ──
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId, userId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setPesan([]);
        setStreamingText(null);
      }
    },
    [userId, activeSession],
  );

  // ── Rename sesi ──
  const handleRenameSession = useCallback(
    async (sessionId: string, newTitle: string) => {
      await renameSession(sessionId, userId, newTitle);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s)),
      );
      if (activeSession?.id === sessionId) {
        setActiveSession((prev) => (prev ? { ...prev, title: newTitle } : null));
      }
    },
    [userId, activeSession],
  );

  // ── Kirim pesan (inti) ──
  async function kirim(teks: string) {
    const isi = teks.trim();
    if (!isi || loading) return;

    // Batalkan streaming sebelumnya
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    // Buat sesi baru jika belum ada
    let sesi = activeSession;
    if (!sesi) {
      sesi = await createSession(
        userId,
        role,
        selectedId,
        generateSessionTitle(isi),
      );
      setSessions((prev) => [sesi!, ...prev]);
      setActiveSession(sesi);
    }

    const pesanUser: PesanWithChips = { role: "user", content: isi };
    const updatedPesan = [...pesan, pesanUser];
    setPesan(updatedPesan);
    setInput("");
    setLoading(true);
    setStreamingText("");
    setError("");

    // Simpan pesan user ke penyimpanan
    await appendMessage(sesi.id, userId, pesanUser);

    // Auto-rename sesi jika masih "Percakapan Baru"
    if (sesi.title === "Percakapan Baru" && pesan.length === 0) {
      const autoTitle = generateSessionTitle(isi);
      await renameSession(sesi.id, userId, autoTitle);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sesi!.id ? { ...s, title: autoTitle } : s,
        ),
      );
      setActiveSession({ ...sesi, title: autoTitle });
      sesi = { ...sesi, title: autoTitle };
    }

    // Streaming response
    let fullReply = "";
    try {
      await sendAiChatStream(
        konteks,
        updatedPesan.slice(0, -1).map((p) => ({ role: p.role, content: p.content })),
        isi,
        (chunk) => {
          fullReply += chunk;
          setStreamingText(fullReply);
        },
        abort.signal,
      );
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(e instanceof Error ? e.message : "Gagal menghubungi asisten");
      }
    }

    if (abort.signal.aborted) return;

    // Selesai streaming — pindah ke state pesan final
    setStreamingText(null);

    const pesanAI: PesanWithChips = {
      role: "assistant",
      content: fullReply,
      chips: [],
      chipsLoading: true,
    };
    const finalPesan = [...updatedPesan, pesanAI];
    setPesan(finalPesan);
    setLoading(false);

    // Simpan reply ke penyimpanan
    await appendMessage(sesi.id, userId, { role: "assistant", content: fullReply });

    // Generate follow-up chips secara async (tidak memblokir UI)
    generateFollowUpChips(konteks, fullReply)
      .then((chips) => {
        setPesan((prev) =>
          prev.map((p, i) =>
            i === prev.length - 1
              ? { ...p, chips, chipsLoading: false }
              : p,
          ),
        );
      })
      .catch(() => {
        setPesan((prev) =>
          prev.map((p, i) =>
            i === prev.length - 1 ? { ...p, chipsLoading: false } : p,
          ),
        );
      });

    inputRef.current?.focus();
  }

  // ── Jelaskan Skor ──
  async function jelaskanSkor() {
    if (loading) return;
    const pertanyaan = `Jelaskan perbedaan skor per komponen untuk kawasan ${terpilih.nama}.`;

    let sesi = activeSession;
    if (!sesi) {
      sesi = await createSession(
        userId,
        role,
        selectedId,
        `Skor ${terpilih.nama}`,
      );
      setSessions((prev) => [sesi!, ...prev]);
      setActiveSession(sesi);
    }

    const pesanUser: PesanWithChips = { role: "user", content: pertanyaan };
    const updatedPesan = [...pesan, pesanUser];
    setPesan(updatedPesan);
    setLoading(true);
    setStreamingText("");
    setError("");

    await appendMessage(sesi.id, userId, pesanUser);

    let fullReply = "";
    try {
      const reply = await getAiInsight(konteksKawasan(terpilih, role, kawasans.length ? kawasans : STATIC_KAWASAN));
      fullReply = reply;

      // Simulate streaming for insight too
      const words = reply.split(" ");
      for (let i = 0; i < words.length; i++) {
        fullReply = words.slice(0, i + 1).join(" ");
        setStreamingText(fullReply);
        await new Promise((r) => setTimeout(r, 28));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat insight");
    }

    setStreamingText(null);
    const pesanAI: PesanWithChips = {
      role: "assistant",
      content: fullReply,
      chips: [],
      chipsLoading: true,
    };
    setPesan([...updatedPesan, pesanAI]);
    setLoading(false);

    await appendMessage(sesi.id, userId, { role: "assistant", content: fullReply });

    generateFollowUpChips(konteks, fullReply)
      .then((chips) => {
        setPesan((prev) =>
          prev.map((p, i) =>
            i === prev.length - 1 ? { ...p, chips, chipsLoading: false } : p,
          ),
        );
      })
      .catch(() => {
        setPesan((prev) =>
          prev.map((p, i) =>
            i === prev.length - 1 ? { ...p, chipsLoading: false } : p,
          ),
        );
      });

    inputRef.current?.focus();
  }

  const kosong = pesan.length === 0 && !loading && streamingText === null;

  const SARAN = [
    "Kawasan mana yang paling cocok untuk pengembangan UMKM kuliner?",
    "Kawasan mana yang memiliki aksesibilitas transit terbaik di Bandung?",
    "Kawasan mana yang paling butuh peningkatan integrasi transportasi?",
    "Bandingkan tiga kawasan dengan skor vitalitas tertinggi.",
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* ── Sidebar ── */}
      <ChatSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        sessions={sessions}
        activeSessionId={activeSession?.id ?? null}
        user={
          user
            ? { displayName, email: user.email ?? "" }
            : null
        }
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={signOut}
      />

      {/* ── Main area ──
          Apple §7: shifts along the SAME path as the sidebar (desktop only).
          On mobile, sidebar overlays — no margin shift.
      */}
      <main
        style={{
          marginLeft: isDesktop && sidebarOpen ? 272 : 0,
          transition: sidebarOpen
            ? "margin-left 320ms cubic-bezier(0.32, 0.72, 0, 1)"
            : "margin-left 260ms cubic-bezier(0.4, 0, 1, 1)",
        }}
        className="relative flex flex-1 flex-col overflow-hidden"
      >
        <div className="ai-aurora pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative mx-auto flex w-full max-w-[880px] flex-1 flex-col px-4 pb-6 pt-6 sm:px-6">
          {/* ── Kontrol: Role + Kawasan ── */}
          <div className="mb-6 flex flex-wrap items-center gap-2 pl-10">
            {/* Role switcher */}
            <div className="pill flex items-center gap-1 bg-surface/80 p-1 shadow-sm ring-1 ring-border/70 backdrop-blur-md">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={cn(
                    "pill px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200",
                    role === r.id
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Kawasan selector */}
            <div className="relative group">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="pill appearance-none h-9 max-w-[240px] truncate bg-surface/80 pl-4 pr-9 text-[13px] font-medium shadow-sm outline-none ring-1 ring-border/70 backdrop-blur transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                aria-label="Pilih kawasan fokus"
              >
                {(kawasans.length ? kawasans : STATIC_KAWASAN).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} · {hitungSkor(k, role)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-foreground">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── Empty State ── */}
          {kosong ? (
            <AnimatedSection
              animation="zoom-in"
              className="flex flex-1 flex-col items-center justify-center text-center py-8"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute size-20 rounded-full bg-primary/10 blur-xl animate-pulse" />
                <AiIcon className="relative size-14" />
              </div>

              <h1 className="headline mt-6 text-[clamp(1.75rem,4vw,2.75rem)] tracking-tight">
                {user
                  ? `${getGreeting()}, ${displayName.split(" ")[0]}!`
                  : "Halo, mari telusuri data kawasan"}
              </h1>
              <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-muted-foreground">
                {user
                  ? "TemuData AI siap menjawab pertanyaan tentang kawasan transit Bandung. Apa yang ingin kamu ketahui?"
                  : "TemuData AI menjawab pertanyaan dan menjelaskan skor vitalitas transit langsung dari data dashboard yang sedang aktif."}
              </p>

              <div className="mt-8 grid w-full max-w-[720px] gap-3 sm:grid-cols-2">
                {SARAN.map((s) => (
                  <button
                    key={s}
                    onClick={() => kirim(s)}
                    className="rounded-2xl border border-border/60 bg-surface/60 p-4 text-left text-[14px] leading-relaxed text-foreground/80 shadow-xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-surface/90 hover:text-foreground hover:shadow-md active:scale-[0.98]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </AnimatedSection>
          ) : (
            // ── Messages ──
            <div
              ref={areaRef}
              className="flex-1 space-y-7 overflow-y-auto pb-6 pr-1 floating-scrollbar"
            >
              {pesan.map((p, i) =>
                p.role === "user" ? (
                  /* User bubble */
                  <div
                    key={i}
                    className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <div className="max-w-[82%] sm:max-w-[75%] rounded-[22px] rounded-tr-xs bg-secondary/90 px-4.5 py-3 text-[14.5px] leading-relaxed text-foreground shadow-xs ring-1 ring-border/50">
                      {p.content}
                    </div>
                  </div>
                ) : (
                  /* AI bubble */
                  <div
                    key={i}
                    className="flex items-start gap-3.5 py-1 animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                      <AiIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] leading-relaxed text-foreground space-y-3 [&>p:last-child]:mb-0 [&>p]:mb-3 [&_ol]:ml-5 [&_ol]:space-y-1.5 [&_ol]:list-decimal [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:ml-5 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[13px] [&_th]:border [&_th]:border-border/60 [&_th]:bg-muted/30 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-border/40 [&_td]:px-3 [&_td]:py-2 [&_code]:rounded [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:font-mono overflow-x-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {p.content}
                        </ReactMarkdown>
                      </div>

                      {/* Follow-up Chips */}
                      {i === pesan.length - 1 && (
                        <FollowUpChips
                          chips={p.chips ?? []}
                          loading={p.chipsLoading}
                          onSelect={(chip) => kirim(chip)}
                        />
                      )}
                    </div>
                  </div>
                ),
              )}

              {/* Streaming bubble
                  Apple §3: continuous feedback during the interaction.
                  Plain text + blinking cursor = real-time feel without
                  re-parsing markdown on every chunk (smoother frame rate).
              */}
              {streamingText && (
                <div className="flex items-start gap-3.5 py-1 animate-in fade-in duration-150">
                  <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                    <AiIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-foreground overflow-x-auto">
                    {streamingText}
                    {/* Blinking cursor — continuous feedback (Apple §3) */}
                    <span className="animate-cursor-blink ml-px text-primary/60">|</span>
                  </div>
                </div>
              )}

              {/* Loading — Apple iMessage-style three dots */}
              {loading && !streamingText && (
                <div className="flex items-start gap-3.5 py-1 animate-in fade-in duration-300">
                  <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                    <AiIcon className="size-4" />
                  </div>
                  <div className="flex items-center gap-[5px] h-7 pt-1">
                    <span className="size-2 rounded-full bg-muted-foreground/40 animate-dot-pulse" style={{ animationDelay: "0ms" }} />
                    <span className="size-2 rounded-full bg-muted-foreground/40 animate-dot-pulse" style={{ animationDelay: "160ms" }} />
                    <span className="size-2 rounded-full bg-muted-foreground/40 animate-dot-pulse" style={{ animationDelay: "320ms" }} />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mx-auto flex w-full max-w-[85%] items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-[14px] text-destructive shadow-sm animate-in fade-in zoom-in-95">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/20">
                    <span className="font-bold">!</span>
                  </div>
                  <p className="flex-1 font-medium leading-relaxed">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Composer ── */}
          <div className="sticky bottom-0 pt-4 pb-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                kirim(input);
              }}
              className="rounded-[28px] border border-border/60 bg-surface/80 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-shadow focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.16)] focus-within:ring-1 focus-within:ring-border"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      kirim(input);
                    }
                  }}
                  disabled={loading}
                  placeholder={
                    loading
                      ? "Menganalisis..."
                      : "Tanya TemuData AI tentang kawasan…"
                  }
                  className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                {/*
                  Apple §1: respond on pointer-down, not on release.
                  active:scale-[0.92] fires on :active (pointer-down),
                  active:transition-none makes the press instant (no delay).
                  Hover scale-105 fires on hover — separate from the press feedback.
                */}
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Kirim pertanyaan"
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-full transition-[transform,background-color,box-shadow] duration-200",
                    input.trim() && !loading
                      ? "bg-foreground text-background hover:scale-105 hover:bg-foreground/90 shadow-md active:scale-[0.92] active:transition-none"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {loading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <ArrowUp className="size-5" />
                  )}
                </button>
              </div>

              {/* Action pills — Apple §1: active:scale press feedback */}
              <div className="flex flex-wrap items-center gap-2 px-2 pb-1 pt-1">
                <button
                  type="button"
                  onClick={jelaskanSkor}
                  disabled={loading}
                  className="pill inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition-colors hover:text-foreground active:scale-[0.96] active:transition-none disabled:opacity-50"
                >
                  <AiIcon /> Jelaskan skor {terpilih?.nama ?? "kawasan"}
                </button>
                {pesan.length > 0 && (
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="pill px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground active:scale-[0.96] active:transition-none"
                  >
                    Percakapan baru
                  </button>
                )}
              </div>
            </form>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Jawaban dihitung dari data dashboard Titik Temu — selalu verifikasi
              sebelum mengambil keputusan.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
