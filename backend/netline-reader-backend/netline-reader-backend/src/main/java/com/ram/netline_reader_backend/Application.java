package com.ram.netline_reader_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;

/**
 * Entry point for the Netline Reader Backend.
 *
 * DataSource and JPA auto-configuration are EXCLUDED because this app
 * uses two databases (PostgreSQL + Oracle). Both are configured manually:
 *   - {@link config.PostgresDataSourceConfig} — primary, read/write
 *   - {@link config.OracleDataSourceConfig}   — secondary, read-only
 *
 * All other auto-configuration (Security, OAuth2, Web) remains active.
 */
@SpringBootApplication(exclude = {
        // We configure DataSources manually for multi-database support.
        // See PostgresDataSourceConfig and OracleDataSourceConfig.
        DataSourceAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class
})
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
