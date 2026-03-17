package com.ram.netline_reader_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Spring Security configuration for the Netline Reader API.
 *
 * - Stateless session (no cookies — JWT only)
 * - CORS enabled for the frontend origins (dev + docker)
 * - CSRF disabled (stateless API)
 * - OAuth2 Resource Server validates Keycloak-issued JWTs
 * - Method-level RBAC via @PreAuthorize annotations on controllers
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity          // enables @PreAuthorize on controller methods
public class SecurityConfig {

    /**
     * Main security filter chain.
     * All /api/** endpoints require a valid JWT.
     * Actuator and health endpoints remain open.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CORS — allow frontend origins
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // CSRF not needed for a stateless JWT API
            .csrf(AbstractHttpConfigurer::disable)

            // Stateless — no server-side session
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // URL-level authorization rules
            .authorizeHttpRequests(auth -> auth
                // Allow pre-flight CORS requests
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Admin-only: user management
                .requestMatchers("/api/users/**").hasRole("admin")

                // Saved filters: any authenticated user
                .requestMatchers("/api/saved-filters/**").authenticated()

                // Everything else requires authentication
                .anyRequest().authenticated()
            )

            // OAuth2 Resource Server — validate Keycloak JWTs
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            );

        return http.build();
    }

    /**
     * Converts Keycloak realm_access.roles into Spring Security ROLE_ authorities.
     * Keycloak stores roles inside the JWT claim: realm_access.roles[]
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRoleConverter());
        return converter;
    }

    /**
     * CORS configuration.
     * Allows the React frontend to call the API from different origins.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
            "http://localhost:5173",     // Vite dev server
            "http://localhost:3000"      // Docker nginx
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
