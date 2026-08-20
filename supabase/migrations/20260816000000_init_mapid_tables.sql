-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Table for PropertiGo (Property Data)
CREATE TABLE IF NOT EXISTS public.tod_grid_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR UNIQUE,
    name VARCHAR,
    category VARCHAR,
    price NUMERIC,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    geom GEOMETRY(Point, 4326)
);

-- Spatial index for fast geographic queries
CREATE INDEX IF NOT EXISTS tod_grid_profiles_geom_idx ON public.tod_grid_profiles USING GIST (geom);


-- 2. Table for MenuGo (F&B / Vitality Data)
CREATE TABLE IF NOT EXISTS public.vitality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR UNIQUE,
    name VARCHAR,
    category VARCHAR,
    rating NUMERIC,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    geom GEOMETRY(Point, 4326)
);

-- Spatial index
CREATE INDEX IF NOT EXISTS vitality_scores_geom_idx ON public.vitality_scores USING GIST (geom);


-- 3. Table for Activities (Field Surveys / Activities Data)
CREATE TABLE IF NOT EXISTS public.field_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR UNIQUE,
    name VARCHAR,
    activity_type VARCHAR,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    geom GEOMETRY(Point, 4326)
);

-- Spatial index
CREATE INDEX IF NOT EXISTS field_surveys_geom_idx ON public.field_surveys USING GIST (geom);
