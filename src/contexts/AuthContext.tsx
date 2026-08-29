import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { getUserRole } from "@/lib/auth.functions";

type AuthRole = "admin" | "user" | null;

interface AuthContextValue {
  user: User | null;
  role: AuthRole;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AuthRole>(null);
  const [loading, setLoading] = useState(true);

  // Fetch role from server (secure check)
  const fetchRole = async (userId: string): Promise<AuthRole> => {
    try {
      const r = await getUserRole({ data: { userId } });
      return r as AuthRole;
    } catch {
      return "user";
    }
  };

  useEffect(() => {
    // Initialize auth state
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const r = await fetchRole(u.id);
        setRole(r);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const r = await fetchRole(u.id);
        setRole(r);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Sanitize error messages (jangan expose detail teknis ke user)
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        return { error: "Email atau kata sandi salah." };
      }
      if (msg.includes("email not confirmed")) {
        return { error: "Silakan konfirmasi email Anda terlebih dahulu." };
      }
      return { error: "Terjadi kesalahan. Coba lagi." };
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        return { error: "Email ini sudah terdaftar. Silakan masuk." };
      }
      if (msg.includes("password")) {
        return { error: "Kata sandi minimal 6 karakter." };
      }
      return { error: "Pendaftaran gagal. Coba lagi." };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user, role, isAdmin: role === "admin",
      loading, signIn, signUp, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
