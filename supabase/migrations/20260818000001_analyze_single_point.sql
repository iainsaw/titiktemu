-- Migration: RPC analyze_single_point
-- Menghitung skor TOD untuk satu titik koordinat arbitrer,
-- menggunakan data riil dari tabel osm_pois, osm_layanan, osm_akses, harga_tanah.
-- Normalisasi benchmark mengikuti analyze_tod_clusters.

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
    klaster_label TEXT;
    s_properti INTEGER;
    s_layanan INTEGER;
    s_ekonomi INTEGER;
    s_akses INTEGER;
BEGIN
    -- Buat geometry point dari lat/lng
    point_geom := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    -- ═══ SKOR EKONOMI: COUNT UMKM (F&B + Komersial) dalam radius 800m ═══
    SELECT COUNT(*) INTO cnt_umkm
    FROM public.osm_pois
    WHERE ST_DWithin(geom, point_geom, 0.0072);

    -- Normalisasi: 0 UMKM = 0, 150+ UMKM = 100
    s_ekonomi := LEAST(100, GREATEST(1, (cnt_umkm * 100 / GREATEST(cnt_umkm, 150))));

    -- ═══ SKOR LAYANAN: COUNT fasilitas publik dalam radius 800m ═══
    SELECT COUNT(*) INTO cnt_layanan
    FROM public.osm_layanan
    WHERE ST_DWithin(geom, point_geom, 0.0072);

    -- Normalisasi: 0 fasilitas = 1, 10+ fasilitas = 100
    s_layanan := LEAST(100, GREATEST(1, (cnt_layanan * 100 / GREATEST(cnt_layanan, 10))));

    -- ═══ SKOR AKSES: COUNT titik transit dalam radius 800m ═══
    SELECT COUNT(*) INTO cnt_akses
    FROM public.osm_akses
    WHERE ST_DWithin(geom, point_geom, 0.0072);

    -- Normalisasi: 0 titik = 1, 40+ titik = 100
    s_akses := LEAST(100, GREATEST(1, (cnt_akses * 100 / GREATEST(cnt_akses, 40))));

    -- ═══ SKOR PROPERTI: rata-rata harga tanah riil dalam radius 800m ═══
    SELECT COALESCE(AVG(harga_tanah_m2), 0) INTO rata_harga
    FROM public.harga_tanah
    WHERE ST_DWithin(geom, point_geom, 0.0072);

    -- Normalisasi: harga 0 = 1, harga 15+ jt/m2 = 100
    IF rata_harga <= 0 THEN
        s_properti := 1;
    ELSE
        s_properti := LEAST(100, GREATEST(1, (rata_harga * 100 / 15)::INT));
    END IF;

    -- ═══ KLASTER: rule-based dari jumlah UMKM riil ═══
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
        'harga_tanah_m2', ROUND(rata_harga::NUMERIC, 2),
        'klaster', klaster_label,
        'skor_properti', s_properti,
        'skor_layanan', s_layanan,
        'skor_ekonomi', s_ekonomi,
        'skor_akses', s_akses
    );
END;
$$ LANGUAGE plpgsql STABLE;
