package com.ram.netline_reader_backend.config;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**
 * Flyway — Database migration configuration.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  WHY DATABASE VERSIONING?                                        │
 * │                                                                  │
 * │  Without it, each developer and each environment (dev/staging/  │
 * │  prod) might have a subtly different schema. A column added      │
 * │  manually on prod, forgotten on dev, causes silent data bugs or  │
 * │  runtime errors that are hard to trace. Hibernate's "update"     │
 * │  mode only adds, never removes — so deleted columns/indexes      │
 * │  silently linger.                                                │
 * │                                                                  │
 * │  HOW FLYWAY WORKS                                                │
 * │  1. On startup, Flyway reads all files matching V{n}__*.sql      │
 * │     from classpath:db/migration/.                                │
 * │  2. It maintains a `flyway_schema_history` table that records    │
 * │     every migration ever applied (version, checksum, timestamp). │
 * │  3. Only migrations with a version number higher than the last   │
 * │     applied are executed — each migration runs exactly once.     │
 * │  4. If a previously-applied script is modified, Flyway detects   │
 * │     the checksum mismatch and refuses to start — protecting      │
 * │     prod from accidental regressions.                            │
 * │                                                                  │
 * │  WHY MANUAL BEAN (not Spring Boot auto-config)?                  │
 * │  Spring Boot's Flyway auto-config expects spring.datasource.*    │
 * │  but we use app.datasource.postgres.* with a custom DataSource   │
 * │  bean. We wire Flyway manually to point it at postgresDataSource. │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Migration naming convention:
 *   V1__initial_schema.sql   — baseline (all tables, sequences, indexes)
 *   V2__add_column_xxx.sql   — additive changes
 *   V3__rename_table_yyy.sql — renames, drops, etc.
 */
@Configuration
@Slf4j
public class FlywayConfig {

    /**
     * Configures and runs Flyway against the primary PostgreSQL datasource.
     *
     * baselineOnMigrate = true  → If no flyway_schema_history table exists on
     *   an already-populated DB (e.g. an existing dev instance that pre-dates
     *   Flyway), insert a baseline record at version 0 and apply V1+ normally.
     *   On a fresh empty DB, V1 creates all tables from scratch.
     *
     * locations = classpath:db/migration → SQL files live under
     *   src/main/resources/db/migration/
     */
    @Bean(name = "flyway", initMethod = "migrate")
    public Flyway flyway(@Qualifier("postgresDataSource") DataSource dataSource) {
        log.info("[Flyway] Configuring database migrations against postgresDataSource");
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .load();
    }
}
