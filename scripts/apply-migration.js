// Script: Apply migration directly via Supabase Management API
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env vars");
  process.exit(1);
}

// Extract project ref from URL: https://<ref>.supabase.co
const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
const sql = fs.readFileSync(
  path.resolve(__dirname, "../supabase/migrations/20260829000001_user_profiles_rbac.sql"),
  "utf8",
);

console.log("Applying migration to project:", projectRef);

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log("Status:", res.status);
console.log("Response:", text);
