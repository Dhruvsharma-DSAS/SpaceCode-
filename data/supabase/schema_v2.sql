-- FIREWORK CHRONOS V2 database schema (Supabase Postgres + PostGIS)
-- Run in Supabase SQL editor, then import CSVs in the order listed in README_DB.md.
-- Rule: NULL means unknown / not observed. It is never replaced by 0.

create extension if not exists postgis;
create extension if not exists vector;

create table if not exists provenance_label (label text primary key, meaning text not null);
create table if not exists data_status (status text primary key, meaning text not null);

create table if not exists region (
  region_id text primary key,
  name text not null,
  country text,
  iso_3166_2 text,
  role text,
  bbox_west double precision, bbox_south double precision,
  bbox_east double precision, bbox_north double precision,
  area_km2_gridded double precision,
  boundary_source text, source_url text, accessed_on date,
  geom_wkt text,
  geom geometry(MultiPolygon, 4326)
);

create table if not exists grid_cell (
  cell_id text primary key,
  row_idx int not null, col_idx int not null,
  center_lat double precision not null, center_lon double precision not null,
  area_km2 double precision not null,
  size_deg double precision not null,
  geom_wkt text,
  geom geometry(Polygon, 4326)
);

create table if not exists region_cell (
  region_id text references region(region_id),
  cell_id text references grid_cell(cell_id),
  coverage_fraction real not null,
  area_in_region_km2 double precision not null,
  primary key (region_id, cell_id)
);

create table if not exists satellite (
  platform_id text primary key, name text, instrument text, norad_id int,
  launch_date date, firms_archive_start date,
  nominal_equator_crossing_lst text, planned_end_as_of_2026_10_27 text,
  firms_sources text, source_urls text, provenance text references provenance_label(label)
);

create table if not exists product (
  product_id text primary key, name text, geometry text, record_start date,
  latency_notes text, key_fields text, source_url text
);

create table if not exists firemask_class (
  product text, value int, meaning_catalogue_2026_10_27 text,
  exposure_rule_v2 text, state text,
  primary key (product, value)
);

create table if not exists data_source (
  source_id text primary key, input_x text, role text, provider text, product text,
  endpoint text, auth_env_var text, cadence text, latency text, backup_of text,
  limits text, licence text, verified_on date, verification_note text
);

create table if not exists formula (
  formula_id text primary key, name text, layer text, family text,
  equation_v1 text, equation_v2 text, audit_verdict text, audit_finding text,
  v2_status text, code_hook_v2 text, ui_surface text
);

create table if not exists formula_alias (
  alias text, context text, formula_id text references formula(formula_id), note text
);

create table if not exists claim_ledger (
  claim_id text primary key, claim text, value text, region text, period text, units text,
  source_url text, verified_on date, status text, test text
);

create table if not exists conflict_log (
  conflict_id text primary key, topic text, old_position text, new_position text,
  evidence text, decision text, tradeoff text, status text
);

-- Real observation tables: filled ONLY by fetch_and_load.py from NASA FIRMS / GEE.
create table if not exists fire_detection (
  id bigserial primary key,
  platform_id text references satellite(platform_id),
  firms_source text not null,
  processing text not null check (processing in ('NRT','SP')),
  latitude double precision not null, longitude double precision not null,
  acq_date date not null, acq_time_utc text not null,
  daynight char(1), confidence_raw text, frp real,
  scan real, track real, bright_hi real, bright_lo real,
  firms_type smallint, version text,
  cell_id text,
  fetched_at timestamptz not null default now(),
  geom geometry(Point, 4326)
);
create index if not exists fire_detection_cell_date on fire_detection (cell_id, acq_date);

create table if not exists cell_day (
  cell_id text references grid_cell(cell_id),
  acq_date date,
  platform_id text,
  daynight char(1),
  n_detections int not null,
  n_nominal_or_high int not null,
  max_frp real,
  primary key (cell_id, acq_date, platform_id, daynight)
);

create table if not exists cell_month (
  cell_id text references grid_cell(cell_id),
  month date,
  platform_id text,
  daynight char(1),
  fire_cell_days int,
  valid_obs_days int,
  cloud_days int,
  status text not null,
  exposure_product text,
  primary key (cell_id, month, platform_id, daynight)
);

create table if not exists calendar_value (
  region_id text references region(region_id),
  month date,
  metric text not null,
  value double precision,
  lo double precision, hi double precision, interval_level real,
  coverage double precision,
  status text not null,
  provenance text references provenance_label(label),
  method_version text not null, config_hash text not null,
  primary key (region_id, month, metric, method_version)
);

create table if not exists calibration (
  region_id text, stratum text, method text,
  k double precision, k_lo double precision, k_hi double precision,
  n_years int, dispersion double precision, heldout_deviance double precision,
  status text, method_version text, config_hash text,
  primary key (region_id, stratum, method, method_version)
);

create table if not exists validation_run (
  run_id text, region_id text, test text, metric text, value double precision,
  threshold text, passed boolean, predeclared_on date, detail jsonb
);

create table if not exists lineage (
  run_id text primary key, started timestamptz, inputs jsonb, code_sha text,
  params jsonb, sources_used jsonb, row_counts jsonb
);

create table if not exists doc_chunk (
  id bigserial primary key, doc_id text, title text, source_url text, source_kind text,
  provenance_tier text, page int, heading_path text, product_version text,
  document_date date, ingested_at timestamptz default now(), checksum text,
  section_key text, allowed_use text, license text, body text, embedding vector(384)
);

-- After CSV import, fill geometry columns from the WKT text:
-- update region set geom = ST_Multi(ST_GeomFromEWKT(geom_wkt)) where geom_wkt <> '';
-- update grid_cell set geom = ST_GeomFromEWKT(geom_wkt);
-- update fire_detection set geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) where geom is null;
-- create index on grid_cell using gist (geom);
-- create index on fire_detection using gist (geom);
