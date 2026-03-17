package com.ram.netline_reader_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Netline Reader Backend.
 * Bootstraps Spring Boot with auto-configuration for JPA, Security, and OAuth2.
 */
@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
