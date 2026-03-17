package com.ram.netline_reader_backend.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
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

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security configuration — Netline Reader API
 *
 * Design decisions:
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │ Stateless JWT authentication (no server-side sessions or cookies)  │
 *  │ All identity information lives in the Keycloak-signed JWT token.   │
 *  └─────────────────────────────────────────────────────────────────────┘
 *
 * Authentication flow:
 *  1. User logs in on the React SPA via the Keycloak login page
 *     (Authorization Code + PKCE — see auth.js).
 *  2. The SPA receives a JWT access token from Keycloak.
 *  3. Every API request includes the token in the Authorization header:
 *       Authorization: Bearer <jwt>
 *  4. Spring Security validates the JWT signature using Keycloak's
 *     public keys (JWKS endpoint) and checks the issuer claim.
 *  5. Keycloak roles are extracted from the JWT claim "realm_access.roles"
 *     by {@link KeycloakRoleConverter} and mapped to ROLE_<name> authorities.
 *
 * Role-based access control (RBAC):
 *  - URL level    : configured here in the SecurityFilterChain
 *  - Method level : @PreAuthorize annotations on controllers
 *    (enabled by @EnableMethodSecurity)
 *
 * Keycloak roles → Spring Security authority mapping:
 *  admin       → ROLE_admin       (full access + user management)
 *  staff_ops   → ROLE_staff_ops   (Gantt, Schedule, Reports)
 *  chef_escale → ROLE_chef_escale (Schedule, Reports — station-scoped)
 *  aol_agent   → ROLE_aol_agent   (Gantt, Schedule — limited view)
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity   // activates @PreAuthorize / @PostAuthorize on controller methods
public class SecurityConfig {

    /**
     * Comma-separated list of frontend origins allowed to call the API.
     * Configured in application.yaml (overridable via CORS_ALLOWED_ORIGINS env var).
     * Default covers both the Vite dev server and the Docker Nginx container.
     */
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private String corsAllowedOrigins;

    // ─────────────────────────────────────────────────────────────────────
    // Security filter chain
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Configures the security filter chain.
     *
     * @param http Spring Security's HttpSecurity builder
     * @return the built SecurityFilterChain bean
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // ── CORS ─────────────────────────────────────────────────────
            // Allow requests from registered frontend origins.
            // The CorsConfigurationSource bean below defines the policy.
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // ── CSRF ─────────────────────────────────────────────────────
            // CSRF protection is not needed for stateless JWT APIs.
            // Tokens are stored in JavaScript memory (not cookies) so
            // there is no cross-site request forgery attack vector.
            .csrf(AbstractHttpConfigurer::disable)

            // ── Session management ────────────────────────────────────────
            // Never create or use a server-side session.
            // Every request is authenticated independently via the JWT.
            .sessionManagement(sm ->
                sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── URL-level access rules ────────────────────────────────────
            // These rules complement the @PreAuthorize annotations on
            // individual controller methods (method-level is more granular).
            .authorizeHttpRequests(auth -> auth

                // Allow pre-flight CORS OPTIONS requests without authentication.
                // Browsers send these before cross-origin requests.
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // User management endpoints — admin role required.
                // Method-level @PreAuthorize("hasRole('admin')") on
                // UserController provides a second enforcement layer.
                .requestMatchers("/api/users/**").hasRole("admin")

                // Saved filter endpoints — any authenticated user.
                .requestMatchers("/api/saved-filters/**").authenticated()

                // All other API endpoints require authentication.
                .anyRequest().authenticated()
            )

            // ── OAuth2 Resource Server ────────────────────────────────────
            // Instructs Spring Security to expect and validate Keycloak JWTs.
            // The JwtAuthenticationConverter extracts realm roles from the token.
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))

                // Custom 401 handler — returns a clean JSON-style message
                // instead of the default HTML error page.
                .authenticationEntryPoint((request, response, ex) -> {
                    response.setContentType("application/json");
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write(
                        "{\"error\":\"Unauthorized\",\"message\":\"Valid JWT token required\"}"
                    );
                })
            )

            // ── Custom 403 handler ────────────────────────────────────────
            // Returns a clean JSON body when an authenticated user lacks
            // the required role for a resource.
            .exceptionHandling(ex -> ex
                .accessDeniedHandler((request, response, denied) -> {
                    response.setContentType("application/json");
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write(
                        "{\"error\":\"Forbidden\",\"message\":\"Insufficient role for this resource\"}"
                    );
                })
            );

        return http.build();
    }

    // ─────────────────────────────────────────────────────────────────────
    // JWT authentication converter
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Wires the {@link KeycloakRoleConverter} into Spring's JWT pipeline.
     *
     * When a JWT is validated, this converter is called to extract the
     * "realm_access.roles" claim and convert each role into a Spring
     * Security GrantedAuthority ("ROLE_admin", "ROLE_staff_ops", …).
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRoleConverter());
        return converter;
    }

    // ─────────────────────────────────────────────────────────────────────
    // CORS configuration
    // ─────────────────────────────────────────────────────────────────────

    /**
     * CORS policy — controls which browser origins may call the API.
     *
     * Allowed origins are read from the {@code app.cors.allowed-origins}
     * property (set via CORS_ALLOWED_ORIGINS env var in docker-compose.yml).
     * Default: Vite dev server (5173) + Docker Nginx (3000).
     *
     * Credentials are enabled so the browser forwards the Authorization
     * header with the JWT token on cross-origin requests.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Parse the comma-separated origins from application.yaml
        List<String> origins = Arrays.asList(corsAllowedOrigins.split(","));
        config.setAllowedOrigins(origins);

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true); // required for Authorization header on cross-origin requests

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config); // apply to all API paths
        return source;
    }
}
