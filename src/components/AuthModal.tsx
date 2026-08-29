import { useState } from "react";
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
const logoMark = { url: "/titik-temu-mark-v2.png" };

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type TabType = "signin" | "signup";

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<TabType>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!open) return null;

  const resetForm = () => {
    setError(null);
    setSuccess(null);
    setEmail("");
    setPassword("");
    setDisplayName("");
  };

  const switchTab = (t: TabType) => {
    setTab(t);
    resetForm();
  };

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePassword = (p: string) => p.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateEmail(email)) {
      setError("Format email tidak valid.");
      return;
    }
    if (!validatePassword(password)) {
      setError("Kata sandi minimal 6 karakter.");
      return;
    }

    setLoading(true);
    try {
      if (tab === "signin") {
        const { error: err } = await signIn(email, password);
        if (err) { setError(err); return; }
        onClose();
        resetForm();
      } else {
        const { error: err } = await signUp(email, password, displayName);
        if (err) { setError(err); return; }
        setSuccess("Akun berhasil dibuat! Silakan masuk dengan email & kata sandi Anda.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/15 bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-250">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 grid size-9 place-items-center rounded-full bg-background/80 text-foreground/70 hover:bg-background hover:text-foreground backdrop-blur-md border border-border/40 transition-colors shadow-sm"
          aria-label="Tutup"
        >
          <X className="size-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[520px]">
          
          {/* LEFT SIDE: Hero Video Background + Overlay Branding */}
          <div className="relative hidden md:flex flex-col justify-between p-8 overflow-hidden bg-ink text-white">
            {/* Background Video */}
            <video
              src="/hero-transit.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 size-full object-cover opacity-60"
            />

            {/* Gradient Mask for High Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/50" />

            {/* Top Logo */}
            <div className="relative z-10 flex items-center gap-2.5">
              <img src={logoMark.url} alt="Logo" className="size-7 brightness-0 invert" />
              <span className="font-display text-[17px] font-bold tracking-tight text-white">
                Titik Temu
              </span>
            </div>

            {/* Center / Bottom Content */}
            <div className="relative z-10 space-y-2">
              <h3 className="font-display text-[26px] font-bold leading-tight text-white tracking-tight">
                Optimasi Kawasan Transit Kota Bandung
              </h3>
              <p className="text-[13px] leading-relaxed text-white/80">
                Analisis spasial berbasis data riil untuk Investor Properti, Pemerintah, dan Pelaku UMKM dalam satu peta interaktif.
              </p>
            </div>
          </div>

          {/* RIGHT SIDE: Clean & Modern Auth Form */}
          <div className="flex flex-col justify-between p-7 sm:p-9 bg-card text-card-foreground">
            
            <div>
              {/* Mobile Header Logo */}
              <div className="flex items-center gap-2 mb-6 md:hidden">
                <img src={logoMark.url} alt="Logo" className="size-6 dark:brightness-0 dark:invert" />
                <span className="font-display text-[16px] font-semibold">Titik Temu</span>
              </div>

              {/* Form Title */}
              <div className="mb-6">
                <h2 className="font-display text-[24px] sm:text-[28px] font-bold tracking-tight text-foreground">
                  {tab === "signin" ? "Masuk Akun" : "Buat Akun Baru"}
                </h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {tab === "signin"
                    ? "Masukkan detail akun Anda untuk melanjutkan."
                    : "Daftar gratis untuk menyimpan kawasan favorit Anda."}
                </p>
              </div>

              {/* Form inputs */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {tab === "signup" && (
                  <div>
                    <label className="block text-[12px] font-medium text-foreground/80 mb-1.5">
                      Nama Tampilan
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                      <input
                        type="text"
                        placeholder="Contoh: Budi Santoso"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
                        className="h-11 w-full rounded-2xl bg-secondary/40 pl-10 pr-4 text-[13.5px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/40 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[12px] font-medium text-foreground/80 mb-1.5">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                    <input
                      type="email"
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.trim().slice(0, 100))}
                      required
                      autoComplete="email"
                      className="h-11 w-full rounded-2xl bg-secondary/40 pl-10 pr-4 text-[13.5px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/40 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-foreground/80 mb-1.5">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value.slice(0, 72))}
                      required
                      autoComplete={tab === "signin" ? "current-password" : "new-password"}
                      className="h-11 w-full rounded-2xl bg-secondary/40 pl-10 pr-10 text-[13.5px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                {error && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-[12.5px] text-destructive">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-[12.5px] text-emerald-600 dark:text-emerald-400">
                    {success}
                  </div>
                )}

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-primary-foreground transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-60 shadow-md shadow-primary/25 mt-2"
                >
                  {loading ? (
                    <Loader2 className="size-4.5 animate-spin" />
                  ) : (
                    <>
                      {tab === "signin" ? "Masuk Sekarang" : "Buat Akun"}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Guest option */}
              <div className="mt-4 pt-4 border-t border-border/30 text-center">
                <button
                  onClick={onClose}
                  className="text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Lanjutkan eksplorasi sebagai Tamu ›
                </button>
              </div>
            </div>

            {/* Footer Tab Switch */}
            <div className="mt-6 text-center text-[13px] text-muted-foreground">
              {tab === "signin" ? (
                <p>
                  Belum punya akun?{" "}
                  <button
                    onClick={() => switchTab("signup")}
                    className="font-semibold text-primary hover:underline"
                  >
                    Daftar di sini
                  </button>
                </p>
              ) : (
                <p>
                  Sudah punya akun?{" "}
                  <button
                    onClick={() => switchTab("signin")}
                    className="font-semibold text-primary hover:underline"
                  >
                    Masuk di sini
                  </button>
                </p>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
