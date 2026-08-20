-- Migration: Real-Time PostGIS Analytics untuk TOD
-- ZERO DUMMY DATA — Seluruh skor dihitung murni dari data OSM & dataset properti riil.

-- 1. Buat ekstensi PostGIS (jika belum ada)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Tabel untuk menyimpan titik bisnis/UMKM riil dari OSM & MAPID
CREATE TABLE IF NOT EXISTS public.osm_pois (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    name TEXT,
    category TEXT,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_osm_pois_geom ON public.osm_pois USING GIST (geom);

-- 2.5 Tabel untuk menyimpan titik dataset Harga Tanah
CREATE TABLE IF NOT EXISTS public.harga_tanah (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    price FLOAT,
    land_area FLOAT,
    building_area FLOAT,
    harga_tanah_m2 FLOAT,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_harga_tanah_geom ON public.harga_tanah USING GIST (geom);

-- 2.6 Tabel untuk menyimpan titik fasilitas layanan publik (RS, klinik, sekolah, universitas)
CREATE TABLE IF NOT EXISTS public.osm_layanan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    name TEXT,
    category TEXT,  -- 'hospital', 'clinic', 'school', 'university'
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_osm_layanan_geom ON public.osm_layanan USING GIST (geom);

-- 2.7 Tabel untuk menyimpan titik akses transit (bus_stop, bus_station, stasiun_rail)
CREATE TABLE IF NOT EXISTS public.osm_akses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    name TEXT,
    category TEXT,  -- 'bus_stop', 'bus_station', 'stasiun_rail'
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_osm_akses_geom ON public.osm_akses USING GIST (geom);

-- 3. Tabel untuk menyimpan stasiun/kawasan
CREATE TABLE IF NOT EXISTS public.tod_stations (
    id TEXT PRIMARY KEY,
    nama TEXT NOT NULL,
    koridor TEXT,
    geom GEOMETRY(Point, 4326),
    umkm_count INTEGER DEFAULT 0,
    layanan_count INTEGER DEFAULT 0,
    akses_count INTEGER DEFAULT 0,
    harga_tanah_m2 FLOAT DEFAULT 0,
    klaster TEXT,
    skor_properti INTEGER DEFAULT 0,
    skor_layanan INTEGER DEFAULT 0,
    skor_ekonomi INTEGER DEFAULT 0,
    skor_akses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tod_stations_geom ON public.tod_stations USING GIST (geom);

-- Pastikan kolom baru ditambahkan jika tabel sudah ada dari versi sebelumnya
ALTER TABLE public.tod_stations ADD COLUMN IF NOT EXISTS layanan_count INTEGER DEFAULT 0;
ALTER TABLE public.tod_stations ADD COLUMN IF NOT EXISTS akses_count INTEGER DEFAULT 0;

-- Aktifkan RLS dan buat policy terbuka untuk anon (hanya untuk hackathon)
ALTER TABLE public.osm_pois ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tod_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harga_tanah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osm_layanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osm_akses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for anon" ON public.osm_pois;
CREATE POLICY "Enable all for anon" ON public.osm_pois FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.tod_stations;
CREATE POLICY "Enable all for anon" ON public.tod_stations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.harga_tanah;
CREATE POLICY "Enable all for anon" ON public.harga_tanah FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.osm_layanan;
CREATE POLICY "Enable all for anon" ON public.osm_layanan FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for anon" ON public.osm_akses;
CREATE POLICY "Enable all for anon" ON public.osm_akses FOR ALL USING (true) WITH CHECK (true);

-- Berikan izin akses penuh
GRANT ALL ON TABLE public.osm_pois TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tod_stations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.harga_tanah TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.osm_layanan TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.osm_akses TO anon, authenticated, service_role;

-- 4. Fungsi RPC: 100% DATA RIIL — ZERO RANDOM()
-- Setiap skor dihitung murni dari COUNT titik OSM di radius buffer PostGIS.
CREATE OR REPLACE FUNCTION public.analyze_tod_clusters()
RETURNS void AS $$
DECLARE
    station RECORD;
    cnt_umkm INTEGER;
    cnt_layanan INTEGER;
    cnt_akses INTEGER;
    rata_harga FLOAT;
    klaster_label TEXT;
    s_properti INTEGER;
    s_layanan INTEGER;
    s_ekonomi INTEGER;
    s_akses INTEGER;
BEGIN
    FOR station IN SELECT * FROM public.tod_stations LOOP

        -- ═══ SKOR EKONOMI: COUNT UMKM (F&B + Komersial) dalam radius 800m ═══
        SELECT COUNT(*) INTO cnt_umkm
        FROM public.osm_pois
        WHERE ST_DWithin(geom, station.geom, 0.0072);

        -- Normalisasi (Relative Benchmark): 0 UMKM = 0, 150+ UMKM = 100
        s_ekonomi := LEAST(100, GREATEST(1, (cnt_umkm * 100 / GREATEST(cnt_umkm, 150))));

        -- ═══ SKOR LAYANAN: COUNT fasilitas publik (RS, Klinik, Sekolah, Univ) dalam radius 800m ═══
        SELECT COUNT(*) INTO cnt_layanan
        FROM public.osm_layanan
        WHERE ST_DWithin(geom, station.geom, 0.0072);

        -- Normalisasi (Relative Benchmark): 0 fasilitas = 1, 10+ fasilitas = 100 (Patokan Dipatiukur)
        s_layanan := LEAST(100, GREATEST(1, (cnt_layanan * 100 / GREATEST(cnt_layanan, 10))));

        -- ═══ SKOR AKSES: COUNT titik transit (bus stop, stasiun, halte) dalam radius 800m ═══
        SELECT COUNT(*) INTO cnt_akses
        FROM public.osm_akses
        WHERE ST_DWithin(geom, station.geom, 0.0072);

        -- Normalisasi (Relative Benchmark): 0 titik = 1, 40+ titik = 100 (Patokan Alun-Alun)
        s_akses := LEAST(100, GREATEST(1, (cnt_akses * 100 / GREATEST(cnt_akses, 40))));

        -- ═══ SKOR PROPERTI: berdasarkan rata-rata harga tanah riil dari dataset CSV dalam radius 800m ═══
        SELECT COALESCE(AVG(harga_tanah_m2), 0) INTO rata_harga
        FROM public.harga_tanah
        WHERE ST_DWithin(geom, station.geom, 0.0072);

        -- Normalisasi: harga 0 = 1, harga 15+ jt/m2 = 100 (Sesuai realita Bandung)
        IF rata_harga <= 0 THEN
            s_properti := 1;
        ELSE
            s_properti := LEAST(100, GREATEST(1, (rata_harga * 100 / 15)::INT));
        END IF;

        -- ═══ KLASTER TOD: rule-based dari jumlah UMKM riil ═══
        IF cnt_umkm > 40 THEN
            klaster_label := 'Inti Komersial';
        ELSIF cnt_umkm > 20 THEN
            klaster_label := 'Transit Campuran';
        ELSIF cnt_umkm > 5 THEN
            klaster_label := 'Permukiman Padat';
        ELSE
            klaster_label := 'Pinggiran Berkembang';
        END IF;

        -- ═══ UPDATE: semua kolom dari data riil ═══
        UPDATE public.tod_stations
        SET 
            umkm_count = cnt_umkm,
            layanan_count = cnt_layanan,
            akses_count = cnt_akses,
            harga_tanah_m2 = rata_harga,
            klaster = klaster_label,
            skor_ekonomi = s_ekonomi,
            skor_layanan = s_layanan,
            skor_akses = s_akses,
            skor_properti = s_properti,
            updated_at = NOW()
        WHERE id = station.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
