package com.ram.netline_reader_backend.config;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * PostgreSQL datasource configuration — the PRIMARY database.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  WHY MANUAL CONFIGURATION?                                         │
 * │                                                                     │
 * │  Our app uses TWO databases (PostgreSQL + Oracle). Spring Boot's   │
 * │  auto-configuration only supports one DataSource. By configuring   │
 * │  both manually, we control exactly which entities and repositories │
 * │  belong to which database — preventing cross-database errors.      │
 * │                                                                     │
 * │  This config is @Primary, so any code that injects DataSource,     │
 * │  EntityManager, or TransactionManager without a qualifier gets     │
 * │  PostgreSQL by default. Existing code works unchanged.             │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Managed entities (read/write):
 *   - User, SavedFilter, Role (enum), Permission (enum)
 *
 * Managed repositories:
 *   - UserRepository, SavedFilterRepository
 */
@Configuration
@EnableJpaRepositories(
        // Scan ONLY the base repository package (not the oracle sub-package)
        basePackages = "com.ram.netline_reader_backend.repository",
        excludeFilters = @org.springframework.context.annotation.ComponentScan.Filter(
                type = org.springframework.context.annotation.FilterType.REGEX,
                pattern = "com\\.ram\\.netline_reader_backend\\.repository\\.oracle\\..*"
        ),
        entityManagerFactoryRef = "postgresEntityManagerFactory",
        transactionManagerRef   = "postgresTransactionManager"
)
public class PostgresDataSourceConfig {

    /**
     * PostgreSQL DataSource — reads connection properties from
     * {@code app.datasource.postgres.*} in application.yaml.
     */
    @Primary
    @Bean(name = "postgresDataSource")
    @ConfigurationProperties(prefix = "app.datasource.postgres")
    public DataSource postgresDataSource() {
        return DataSourceBuilder.create().build();
    }

    /**
     * EntityManagerFactory for PostgreSQL.
     *
     * Scans ONLY the base entity package (User, SavedFilter) —
     * NOT the entity.oracle sub-package (Leg, FlightTime, etc.).
     *
     * Uses ddl-auto=update so Hibernate auto-creates/migrates
     * PostgreSQL tables on startup.
     */
    @Primary
    @Bean(name = "postgresEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean postgresEntityManagerFactory(
            @Qualifier("postgresDataSource") DataSource dataSource) {

        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);

        // IMPORTANT: packagesToScan does NOT scan sub-packages by default in
        // LocalContainerEntityManagerFactoryBean — it uses exact package matching.
        // So "entity" here will NOT include "entity.oracle".
        em.setPackagesToScan("com.ram.netline_reader_backend.entity");
        em.setPersistenceUnitName("postgres");

        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        vendorAdapter.setShowSql(true);
        vendorAdapter.setGenerateDdl(true); // allows Hibernate to create/update tables
        em.setJpaVendorAdapter(vendorAdapter);

        Map<String, Object> properties = new HashMap<>();
        properties.put("hibernate.hbm2ddl.auto", "update");
        properties.put("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        properties.put("hibernate.format_sql", "true");
        em.setJpaPropertyMap(properties);

        return em;
    }

    /**
     * Transaction manager for PostgreSQL — used by @Transactional on
     * services that write to User/SavedFilter tables.
     */
    @Primary
    @Bean(name = "postgresTransactionManager")
    public PlatformTransactionManager postgresTransactionManager(
            @Qualifier("postgresEntityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }
}
