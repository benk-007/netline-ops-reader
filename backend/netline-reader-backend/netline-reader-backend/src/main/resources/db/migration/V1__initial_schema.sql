-- ══════════════════════════════════════════════════════════════════════════
-- V1 — Initial schema
-- Creates all PostgreSQL tables managed by this application.
--
-- ALL statements use IF NOT EXISTS so this script is idempotent:
--   • Fresh install  → creates everything from scratch.
--   • Existing dev DB → no-op (tables already there from Hibernate "update").
--
-- Tables:
--   users                       — application users (Keycloak-linked)
--   user_assigned_airports      — airport codes assigned to station managers
--   user_permissions            — per-user fine-grained permissions
--   saved_filters               — named filter profiles per user
--   saved_filter_dep_airports   — dep airport filter values
--   saved_filter_arr_airports   — arr airport filter values
--   saved_filter_service_types  — service type filter values
--   saved_filter_aircraft_types — aircraft type filter values
--   saved_filter_flight_numbers — flight number filter values
--   leg_mv                      — dev-only: flat PostgreSQL table simulating
--                                 the Oracle MV_LEG materialized view
--   leg_mv_delay                — dev-only: delay codes per leg_mv row
-- ══════════════════════════════════════════════════════════════════════════

-- ── Users ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           BIGSERIAL    PRIMARY KEY,
    keycloak_id  VARCHAR(255) UNIQUE,
    matricule    VARCHAR(255) NOT NULL UNIQUE,
    full_name    VARCHAR(255) NOT NULL,
    password     VARCHAR(255) NOT NULL,
    role         VARCHAR(50)  NOT NULL,
    is_activated BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_assigned_airports (
    user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    airport_code VARCHAR(3)  NOT NULL
);

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL
);

-- ── Saved filters ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_filters (
    id      BIGSERIAL    PRIMARY KEY,
    name    VARCHAR(255) NOT NULL,
    user_id BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_filter_dep_airports (
    saved_filter_id BIGINT       NOT NULL REFERENCES saved_filters(id) ON DELETE CASCADE,
    dep_airport     VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS saved_filter_arr_airports (
    saved_filter_id BIGINT       NOT NULL REFERENCES saved_filters(id) ON DELETE CASCADE,
    arr_airport     VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS saved_filter_service_types (
    saved_filter_id BIGINT       NOT NULL REFERENCES saved_filters(id) ON DELETE CASCADE,
    service_type    VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS saved_filter_aircraft_types (
    saved_filter_id BIGINT       NOT NULL REFERENCES saved_filters(id) ON DELETE CASCADE,
    aircraft_type   VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS saved_filter_flight_numbers (
    saved_filter_id BIGINT       NOT NULL REFERENCES saved_filters(id) ON DELETE CASCADE,
    flight_number   VARCHAR(255)
);

-- ── Leg MV (dev profile — simulates Oracle materialized view) ─────────────
CREATE TABLE IF NOT EXISTS leg_mv (
    leg_no                  BIGINT       PRIMARY KEY,
    flight_number           VARCHAR(10)  NOT NULL,
    carrier_code            VARCHAR(3),
    operational_date        DATE         NOT NULL,
    leg_state               VARCHAR(20),
    leg_type                VARCHAR(3),

    -- Flight times
    std                     TIMESTAMP,
    sta                     TIMESTAMP,
    etd                     TIMESTAMP,
    eta                     TIMESTAMP,
    off_block               TIMESTAMP,
    airborne                TIMESTAMP,
    landing                 TIMESTAMP,
    on_block                TIMESTAMP,

    -- Flight load
    pax_booked              INTEGER,
    pax_flown               INTEGER,
    pax_business            INTEGER,
    pax_economy             INTEGER,
    cargo_weight            DOUBLE PRECISION,
    baggage_weight          DOUBLE PRECISION,

    -- Departure airport (denormalized)
    dep_airport_code        VARCHAR(3),
    dep_airport_name        TEXT,
    dep_timezone            TEXT,
    dep_latitude            DOUBLE PRECISION,
    dep_longitude           DOUBLE PRECISION,

    -- Arrival airport (denormalized)
    arr_airport_code        VARCHAR(3),
    arr_airport_name        TEXT,
    arr_timezone            TEXT,
    arr_latitude            DOUBLE PRECISION,
    arr_longitude           DOUBLE PRECISION,

    -- Aircraft (denormalized)
    aircraft_registration   VARCHAR(10),
    aircraft_sub_type       VARCHAR(20),
    aircraft_max_weight     DOUBLE PRECISION,
    aircraft_cargo_capacity DOUBLE PRECISION,

    -- Metadata
    last_refreshed          TIMESTAMP
);

-- Indexes for the most common query patterns
CREATE INDEX IF NOT EXISTS idx_leg_mv_date
    ON leg_mv (operational_date);
CREATE INDEX IF NOT EXISTS idx_leg_mv_flight_date
    ON leg_mv (flight_number, operational_date);
CREATE INDEX IF NOT EXISTS idx_leg_mv_dep_date
    ON leg_mv (dep_airport_code, operational_date);
CREATE INDEX IF NOT EXISTS idx_leg_mv_arr_date
    ON leg_mv (arr_airport_code, operational_date);
CREATE INDEX IF NOT EXISTS idx_leg_mv_aircraft_date
    ON leg_mv (aircraft_registration, operational_date);

-- ── Leg MV delays (1:N per leg) ───────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS leg_mv_delay_seq
    START WITH 1 INCREMENT BY 50;

CREATE TABLE IF NOT EXISTS leg_mv_delay (
    id          BIGINT      PRIMARY KEY DEFAULT nextval('leg_mv_delay_seq'),
    leg_no      BIGINT      NOT NULL REFERENCES leg_mv(leg_no) ON DELETE CASCADE,
    code        VARCHAR(5),
    duration    INTEGER,
    description TEXT
);
