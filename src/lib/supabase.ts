import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateSecureAssetUrl } from "./supabase.functions";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Mendukung penggunaan nama VITE_SUPABASE_ANON_KEY atau VITE_SUPABASE_PUBLISHABLE_KEY
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase belum dikonfigurasi (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY kosong). Aplikasi berjalan dengan data lokal.",
  );
}

// Stub aman: jangan sampai app crash saat env belum tersedia (SSR/preview)
function createStubClient(): SupabaseClient {
  const err = { message: "Supabase belum dikonfigurasi" };
  const thenable = Promise.resolve({ data: null, error: err });
  const queryStub: any = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "then") return thenable.then.bind(thenable);
        return () => queryStub;
      },
    },
  );
  return {
    from: () => queryStub,
    rpc: () => queryStub,
    auth: {
      signUp: async () => ({ data: null, error: err }),
      signInWithPassword: async () => ({ data: null, error: err }),
      signOut: async () => ({ error: err }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => ({ data: { signedUrl: `/${path}` }, error: null }),
      }),
    },
  } as unknown as SupabaseClient;
}

// Inisialisasi client Supabase
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : createStubClient();


/**
 * Fungsi Auth Sederhana: Sign Up menggunakan Email dan Password
 */
export async function signUpUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) {
    console.error("Gagal melakukan Sign Up:", error.message);
    return { success: false, error };
  }
  return { success: true, data };
}

/**
 * Fungsi Auth Sederhana: Sign In menggunakan Email dan Password
 */
export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    console.error("Gagal melakukan Sign In:", error.message);
    return { success: false, error };
  }
  return { success: true, data };
}

/**
 * Fungsi Auth Sederhana: Sign Out
 */
export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Gagal melakukan Sign Out:", error.message);
    return { success: false, error };
  }
  return { success: true };
}

/**
 * Fungsi sederhana untuk mengecek koneksi database ke Supabase
 * Dengan mengambil informasi user saat ini.
 */
export async function checkSupabaseConnection() {
  try {
    // Mengecek apakah client bisa melakukan query ke auth (koneksi basic)
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    console.log("Koneksi ke Supabase berhasil! Session saat ini:", data.session ? "Ada" : "Tidak ada");
    return true;
  } catch (error) {
    console.error("Koneksi ke Supabase bermasalah:", error);
    return false;
  }
}

export async function fetchGeoJSON(tableName: string) {
  if (!isSupabaseConfigured) return null;
  // Fetch GeoJSON directly using PostgREST headers
  const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
    headers: {
      apikey: supabaseKey ?? "",
      Authorization: `Bearer ${supabaseKey ?? ""}`,
      Accept: "application/geo+json",
    },
  });

  if (!response.ok) {
    console.error(`Error fetching ${tableName}:`, await response.text());
    return null;
  }

  return await response.json();
}

/**
 * Mendapatkan Signed URL sementara untuk file dari bucket 'secure-assets'.
 */
export async function getSecureAssetUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
  if (!isSupabaseConfigured) return filePath; // Fallback jika belum di-config
  
  try {
    return await generateSecureAssetUrl({ data: { path: filePath, expiresIn } });
  } catch (err) {
    console.error(`Exception saat mengambil Signed URL untuk ${filePath}:`, err);
    return null;
  }
}
