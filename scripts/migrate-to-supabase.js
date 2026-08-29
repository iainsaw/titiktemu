import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const BUCKET_NAME = 'secure-assets';
const PUBLIC_DIR = path.resolve(__dirname, '../public');

// Allowed extensions to migrate
const ALLOWED_EXTENSIONS = ['.geojson', '.json', '.csv', '.jpg'];
// Files to ignore (e.g. site-selection-bandung.json is metadata maybe, but user said all geojson, json, csv, jpg)
// Let's migrate them all.

async function migrate() {
  console.log(`Ensuring bucket "${BUCKET_NAME}" exists...`);
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.error('Error listing buckets:', bucketError);
    return;
  }

  let bucketExists = buckets.some(b => b.name === BUCKET_NAME);
  if (!bucketExists) {
    console.log(`Creating bucket "${BUCKET_NAME}"...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
    });
    if (createError) {
      console.error('Error creating bucket:', createError);
      return;
    }
  }

  const files = fs.readdirSync(PUBLIC_DIR);
  let uploadCount = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      const filePath = path.join(PUBLIC_DIR, file);
      // Skip directories if any match extension (unlikely)
      if (fs.statSync(filePath).isDirectory()) continue;

      console.log(`Uploading ${file}...`);
      const fileBuffer = fs.readFileSync(filePath);
      
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(file, fileBuffer, {
          upsert: true,
          contentType: ext === '.geojson' || ext === '.json' ? 'application/json' 
                     : ext === '.csv' ? 'text/csv' 
                     : 'image/jpeg'
        });

      if (error) {
        console.error(`Failed to upload ${file}:`, error.message);
      } else {
        console.log(`Success: ${file}`);
        uploadCount++;
      }
    }
  }

  console.log(`\nMigration complete. Uploaded ${uploadCount} files.`);
}

migrate().catch(console.error);
