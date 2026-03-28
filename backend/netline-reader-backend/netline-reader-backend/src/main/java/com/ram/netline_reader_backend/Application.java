package com.ram.netline_reader_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the Netline Reader Backend.
 *
 * DataSource and JPA auto-configuration are EXCLUDED because this app
 * uses two databases (PostgreSQL + Oracle). Both are configured manually:
 *   - {@link config.PostgresDataSourceConfig} — primary, read/write
 *   - {@link config.OracleDataSourceConfig}   — secondary, read-only (prod only)
 *
 * {@code @EnableScheduling} — activates the fake MV refresh job in dev.
 * {@code @EnableCaching}    — activates @Cacheable on LegServiceImpl.
 */
@SpringBootApplication(exclude = {
        DataSourceAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class
})
@EnableScheduling
@EnableCaching
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
