CREATE TABLE forest_plots (
                              id VARCHAR PRIMARY KEY,
                              code_region VARCHAR(10),
                              code_departement VARCHAR(10),
                              code_commune VARCHAR(10),
                              lieu_dit VARCHAR(255),
                              geom GEOMETRY(MultiPolygon, 4326),  -- ← MultiPolygon!
                              essences VARCHAR(100)[],
                              surface_hectares DOUBLE PRECISION,
                              type_foret VARCHAR(100)
);

CREATE TABLE public.users (
                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              email VARCHAR(255) UNIQUE NOT NULL,
                              password_hash VARCHAR(255) NOT NULL,
                              first_name VARCHAR(255),
                              last_name VARCHAR(255),
                              last_lng DOUBLE PRECISION,
                              last_lat DOUBLE PRECISION,
                              last_zoom DOUBLE PRECISION,
                              last_filters JSONB,
                              created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
                              updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- for UUID generation
CREATE EXTENSION IF NOT EXISTS "postgis";      -- for geometry types

-- Users table
CREATE TABLE public.users (
                              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                              email VARCHAR(255) UNIQUE NOT NULL,
                              password_hash VARCHAR(255) NOT NULL,
                              first_name VARCHAR(255),
                              last_name VARCHAR(255),
                              last_lng DOUBLE PRECISION,
                              last_lat DOUBLE PRECISION,
                              last_zoom DOUBLE PRECISION,
                              last_filters JSONB,
                              created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
                              updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User polygons table
CREATE TABLE public.user_polygons (
                                      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                                      name VARCHAR(255) NOT NULL,
                                      geometry geometry(MultiPolygon, 4326) NOT NULL,
                                      area_hectares DOUBLE PRECISION NOT NULL,
                                      analysis_results JSONB,
                                      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
                                      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Optional index for faster spatial queries
CREATE INDEX idx_user_polygons_geometry ON public.user_polygons USING GIST (geometry);