-- Migration: Surveys, Team Members, and Updated RPC
-- 1. Create Surveys Table
CREATE TABLE IF NOT EXISTS public.surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kawasan_id TEXT NOT NULL,
    lokasi TEXT NOT NULL,
    tanggal TEXT NOT NULL,
    surveyor TEXT NOT NULL,
    metode TEXT NOT NULL,
    titik INTEGER DEFAULT 0,
    temuan JSONB DEFAULT '[]'::jsonb,
    catatan TEXT,
    fotos JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    label TEXT NOT NULL,
    peran TEXT NOT NULL,
    teks TEXT NOT NULL,
    linkedin BOOLEAN DEFAULT false,
    foto_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Allow read for all
CREATE POLICY "Enable read for all" ON public.surveys FOR SELECT USING (true);
CREATE POLICY "Enable read for all" ON public.team_members FOR SELECT USING (true);

-- Allow all actions for anon (for MVP hackathon mode)
CREATE POLICY "Enable all for anon" ON public.surveys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for anon" ON public.team_members FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.surveys TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.team_members TO anon, authenticated, service_role;

-- 3. Create Storage Bucket for Images (If it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
-- Boleh dibaca semua orang
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'images');
-- Boleh diupload/hapus oleh siapapun (Hackathon Mode, normally restrict to auth.uid())
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'images');

-- 4. Update RPC analyze_single_point to include jarak_transit
CREATE OR REPLACE FUNCTION public.analyze_single_point(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION
)
RETURNS JSON AS $$
DECLARE
    point_geom GEOMETRY;
    cnt_umkm INTEGER;
    cnt_layanan INTEGER;
    cnt_akses INTEGER;
    rata_harga FLOAT;
    jarak_transit FLOAT;
    klaster_label TEXT;
    s_properti INTEGER;
    s_layanan INTEGER;
    s_ekonomi INTEGER;
    s_akses INTEGER;
BEGIN
    -- Buat geometry point dari lat/lng
    point_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    -- Jarak ke titik transit terdekat (dalam meter)
    SELECT COALESCE(MIN(ST_DistanceSphere(geom, point_geom)), 0) INTO jarak_transit
    FROM public.osm_akses;

    -- SKOR EKONOMI
    SELECT COUNT(*) INTO cnt_umkm
    FROM public.osm_pois
    WHERE ST_DWithin(geom, point_geom, 0.0072);

    s_ekonomi := LEAST(100, GREATEST(1, (cnt_umkm * 100 / GREATEST(cnt_umkm, 150))));

    -- SKOR LAYANAN
    SELECT COUNT(*) INTO cnt_layanan
    FROM public.osm_layanan
    WHERE ST_DWithin(geom, point_geom, 0.0072);

    s_layanan := LEAST(100, GREATEST(1, (cnt_layanan * 100 / GREATEST(cnt_layanan, 10))));

    -- SKOR AKSES
    SELECT COUNT(*) INTO cnt_akses
    FROM public.osm_akses
    WHERE ST_DWithin(geom, point_geom, 0.0072);

    s_akses := LEAST(100, GREATEST(1, (cnt_akses * 100 / GREATEST(cnt_akses, 40))));

    -- SKOR PROPERTI
    SELECT COALESCE(AVG(harga_tanah_m2), 0) INTO rata_harga
    FROM public.harga_tanah
    WHERE ST_DWithin(geom, point_geom, 0.0072);

    IF rata_harga <= 0 THEN
        s_properti := 1;
    ELSE
        s_properti := LEAST(100, GREATEST(1, (rata_harga * 100 / 15)::INT));
    END IF;

    -- KLASTER
    IF cnt_umkm > 40 THEN
        klaster_label := 'Inti Komersial';
    ELSIF cnt_umkm > 20 THEN
        klaster_label := 'Transit Campuran';
    ELSIF cnt_umkm > 5 THEN
        klaster_label := 'Permukiman Padat';
    ELSE
        klaster_label := 'Pinggiran Berkembang';
    END IF;

    -- Return hasil sebagai JSON
    RETURN json_build_object(
        'umkm_count', cnt_umkm,
        'layanan_count', cnt_layanan,
        'akses_count', cnt_akses,
        'jarak_transit', ROUND(jarak_transit::NUMERIC),
        'harga_tanah_m2', ROUND(rata_harga::NUMERIC, 2),
        'klaster', klaster_label,
        'skor_properti', s_properti,
        'skor_layanan', s_layanan,
        'skor_ekonomi', s_ekonomi,
        'skor_akses', s_akses
    );
END;
$$ LANGUAGE plpgsql STABLE;
