package com.ram.netline_reader_backend.config;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Oracle datasource configuration — the SECONDARY, READ-ONLY database.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  PURPOSE                                                           │
 * │                                                                     │
 * │  Connects to the Oracle database hosting Netline OPS materialized  │
 * │  views. The operational flight data (legs, times, loads, delays,   │
 * │  airports, aircraft) is refreshed by Oracle on a schedule set by   │
 * │  the DBA — our app only reads it.                                  │
 * │                                                                     │
 * │  We NEVER write to this database.                                  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * This config creates:
 *   1. oracleDataSource           — JDBC connection pool to Oracle
 *   2. oracleEntityManagerFactory — manages entities in entity.oracle
 *   3. oracleTransactionManager   — read-only transaction support
 *
 * Managed entities (read-only):
 *   - Leg, FlightTime, FlightLoad, Delay, Airport, Aircraft
 *
 * Managed repositories:
 *   - LegRepository, AirportRepository, AircraftRepository
 */
@Configuration
@ConditionalOnProperty(name = "app.oracle.enabled", havingValue = "true")
@EnableJpaRepositories(
        basePackages            = "com.ram.netline_reader_backend.repository.oracle",
        entityManagerFactoryRef = "oracleEntityManagerFactory",
        transactionManagerRef   = "oracleTransactionManager"
)
public class OracleDataSourceConfig {

    /**
     * Oracle DataSource — reads connection properties from
     * {@code app.datasource.oracle.*} in application.yaml.
     *
     * Uses a read-only Oracle user with SELECT privileges
     * on the materialized views (MV_LEG, MV_FLIGHT_TIME, etc.).
     */
    @Bean(name = "oracleDataSource")
    @ConfigurationProperties(prefix = "app.datasource.oracle")
    public DataSource oracleDataSource() {
        return DataSourceBuilder.create().build();
    }

    /**
     * EntityManagerFactory for Oracle entities.
     *
     * Critical settings:
     *   - ddl-auto = none → NEVER create/alter Oracle tables
     *   - dialect = OracleDialect → generates Oracle-compatible SQL
     *   - generateDdl = false → safety net, no DDL generation
     *   - packagesToScan → ONLY entity.oracle sub-package
     */
    @Bean(name = "oracleEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean oracleEntityManagerFactory(
            @Qualifier("oracleDataSource") DataSource dataSource) {

        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.ram.netline_reader_backend.entity.oracle");
        em.setPersistenceUnitName("oracle");

        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        vendorAdapter.setShowSql(true);
        vendorAdapter.setGenerateDdl(false); // NEVER generate DDL for Oracle
        em.setJpaVendorAdapter(vendorAdapter);

        Map<String, Object> properties = new HashMap<>();
        // NEVER auto-create or alter Oracle tables — they are
        // materialized views managed by the Oracle DBA.
        properties.put("hibernate.hbm2ddl.auto", "none");
        properties.put("hibernate.dialect", "org.hibernate.dialect.OracleDialect");
        properties.put("hibernate.format_sql", "true");
        em.setJpaPropertyMap(properties);

        return em;
    }

    /**
     * Transaction manager for Oracle — read-only transactions.
     *
     * Services querying leg data must reference this explicitly:
     *   @Transactional(value = "oracleTransactionManager", readOnly = true)
     */
    @Bean(name = "oracleTransactionManager")
    public PlatformTransactionManager oracleTransactionManager(
            @Qualifier("oracleEntityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }
}
