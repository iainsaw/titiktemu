import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { SiteHeader } from "@/components/SiteHeader";
import { AiIcon } from "@/components/AiIcon";
import { AnimatedSection } from "@/components/AnimatedSection";
import { konteksDashboard, konteksKawasan } from "@/lib/ai-konteks";
import { getAiInsight, sendAiChat, type Pesan } from "@/lib/llm";
import { useKawasans } from "@/hooks/useKawasans";
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
    peran: PERAN_VALID.includes(search.peran as RoleId) ? (search.peran as RoleId) : undefined,
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

function TemuDataAi() {
  const { peran: peranAwal, kawasan: kawasanAwal } = Route.useSearch();
  const [role, setRole] = useState<RoleId>(peranAwal ?? "investor");
  const { kawasans } = useKawasans();
  
  const SARAN = [
    "Kawasan mana yang paling cocok untuk UMKM kuliner malam?",
    kawasans.length > 1 ? `Kenapa ${kawasans.find(k => k.anomali)?.nama || kawasans[1].nama} ditandai sebagai anomali peluang?` : "Kenapa kawasan ini ditandai sebagai anomali peluang?",
    "Kawasan mana yang paling butuh penambahan layanan?",
    "Bandingkan tiga kawasan dengan skor properti tertinggi.",
  ];
  const [selectedId, setSelectedId] = useState<string>(kawasanAwal ?? STATIC_KAWASAN[0].id);

  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const areaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    areaRef.current?.scrollTo({ top: areaRef.current.scrollHeight, behavior: "smooth" });
  }, [pesan, loading]);

  const terpilih = kawasans.find((k) => k.id === selectedId) ?? kawasans[0];

  async function kirim(teks: string) {
    const isi = teks.trim();
    if (!isi || loading) return;
    const baru = [...pesan, { role: "user" as const, content: isi }];
    setPesan(baru);
    setInput("");
    setLoading(true);
    setError("");
    try {
      const reply = await sendAiChat(konteksDashboard(role, kawasans, terpilih), pesan, isi);
      setPesan([...baru, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghubungi asisten");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function jelaskanSkor() {
    if (loading) return;
    const pertanyaan = `Jelaskan perbedaan skor per komponen untuk kawasan ${terpilih.nama}.`;
    const baru = [...pesan, { role: "user" as const, content: pertanyaan }];
    setPesan(baru);
    setLoading(true);
    setError("");
    try {
      const reply = await getAiInsight(konteksKawasan(terpilih, role, kawasans));
      setPesan([...baru, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat insight");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const kosong = pesan.length === 0 && !loading;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="ai-aurora pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative mx-auto flex w-full max-w-[880px] flex-1 flex-col px-4 pb-6 pt-6 sm:px-6">
          {/* Kontrol konteks */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
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

            <div className="relative group">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="pill appearance-none h-9 max-w-[240px] truncate bg-surface/80 pl-4 pr-9 text-[13px] font-medium shadow-sm outline-none ring-1 ring-border/70 backdrop-blur transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                aria-label="Pilih kawasan fokus"
              >
                {kawasans.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} · {hitungSkor(k, role)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-foreground">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          {kosong ? (
            <AnimatedSection animation="zoom-in" className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-inner ring-1 ring-primary/20">
                <AiIcon className="size-8" />
              </div>
              <h1 className="headline mt-6 text-[clamp(1.75rem,4vw,2.75rem)] tracking-tight">
                Halo, mari telusuri data kawasan
              </h1>
              <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-muted-foreground">
                TemuData AI menjawab pertanyaan dan menjelaskan skor vitalitas transit langsung dari
                data dashboard yang sedang aktif.
              </p>

              <div className="mt-8 grid w-full max-w-[720px] gap-3 sm:grid-cols-2">
                {SARAN.map((s) => (
                  <button
                    key={s}
                    onClick={() => kirim(s)}
                    className="rounded-2xl border border-border/60 bg-surface/60 p-4 text-left text-[14px] text-foreground/80 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-surface/90 hover:text-foreground hover:shadow-md active:scale-[0.98]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </AnimatedSection>
          ) : (
            <div ref={areaRef} className="flex-1 space-y-6 overflow-y-auto pb-4 pr-1">
              {pesan.map((p, i) =>
                p.role === "user" ? (
                  <div key={i} className="flex justify-end animate-in fade-in slide-in-from-right-2">
                    <div className="max-w-[85%] rounded-[24px] rounded-br-sm bg-primary px-5 py-3 text-[15px] leading-relaxed text-primary-foreground shadow-sm">
                      {p.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2">
                    <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary shadow-sm ring-1 ring-border/50">
                      <AiIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 rounded-[24px] rounded-tl-sm bg-surface/80 px-5 py-3.5 text-[15px] leading-relaxed text-foreground shadow-sm ring-1 ring-border/50 backdrop-blur-md [&>p:last-child]:mb-0 [&>p]:mb-3 [&_ol]:ml-5 [&_ol]:space-y-1 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:ml-5 [&_ul]:space-y-1 [&_ul]:list-disc">
                      <ReactMarkdown>{p.content}</ReactMarkdown>
                    </div>
                  </div>
                ),
              )}

              {loading && (
                <div className="flex gap-3 animate-in fade-in">
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary shadow-sm ring-1 ring-border/50">
                    <AiIcon className="size-4 animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-2.5 rounded-[24px] rounded-tl-sm bg-surface/50 p-4 shadow-sm ring-1 ring-border/50 backdrop-blur-md">
                    <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
                    <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
                    <div className="h-4 w-5/6 animate-pulse rounded-md bg-muted" />
                  </div>
                </div>
              )}

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

          {/* Composer */}
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
                  placeholder={loading ? "Menganalisis..." : "Tanya TemuData AI tentang kawasan…"}
                  className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Kirim pertanyaan"
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-full transition-all duration-200",
                    input.trim() && !loading
                      ? "bg-foreground text-background hover:scale-105 hover:bg-foreground/90 shadow-md"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {loading ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 px-2 pb-1 pt-1">
                <button
                  type="button"
                  onClick={jelaskanSkor}
                  disabled={loading}
                  className="pill inline-flex items-center gap-1.5 bg-secondary px-3 py-1.5 text-[12px] font-medium text-foreground/80 transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <AiIcon /> Jelaskan skor {terpilih.nama}
                </button>
                {pesan.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPesan([]);
                      setError("");
                    }}
                    className="pill px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    Percakapan baru
                  </button>
                )}
              </div>
            </form>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Jawaban dihitung dari data dashboard Titik Temu — selalu verifikasi sebelum mengambil
              keputusan.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
