import { createServerFn } from "@tanstack/react-start";
import { supabaseServer } from "./supabase.server";

export const generateSecureAssetUrl = createServerFn({ method: "POST" })
  .validator((data: { path: string; expiresIn?: number }) => data)
  .handler(async ({ data: { path, expiresIn = 3600 } }) => {
    if (!supabaseServer) return null;

    const normalizedPath = path.startsWith("/") ? path.substring(1) : path;

    const { data, error } = await supabaseServer.storage
      .from("secure-assets")
      .createSignedUrl(normalizedPath, expiresIn);

    if (error) {
      console.error(`Gagal mendapatkan Signed URL untuk ${normalizedPath}:`, error.message);
      return null;
    }

    return data?.signedUrl || null;
  });
