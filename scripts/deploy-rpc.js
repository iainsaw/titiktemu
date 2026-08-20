import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envData = fs.readFileSync(envPath, 'utf8');
    envData.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) process.env[match[1]] = match[2];
    });
  } catch (e) {}
}
loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL atau SUPABASE_KEY tidak ditemukan!");
  process.exit(1);
}

async function deploySql() {
  const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20260818000001_analyze_single_point.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log("🚀 Deploying analyze_single_point RPC ke Supabase...");

  // Use the REST API to execute raw SQL via the pg_net extension or management API
  // Since we're using anon key, we'll use the SQL endpoint
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  // Alternative: Execute via supabase client's rpc with raw SQL
  // This won't work with anon key for DDL, so let's try a different approach
  
  // Best approach: use the Supabase Management API or just print instructions
  console.log("\n📋 SQL yang perlu dijalankan di Supabase Dashboard → SQL Editor:");
  console.log("━".repeat(60));
  console.log(sql);
  console.log("━".repeat(60));
  console.log("\n📝 Cara deploy:");
  console.log("1. Buka https://supabase.com/dashboard/project/rynrihdqwjfmpolheojz/sql/new");
  console.log("2. Paste SQL di atas");
  console.log("3. Klik 'Run'");
  console.log("\n🧪 Setelah deploy, test dengan:");
  console.log("SELECT * FROM analyze_single_point(-6.9218, 107.6061);");
  console.log("(Harus mengembalikan skor TOD untuk Alun-Alun Bandung)");
}

deploySql();
