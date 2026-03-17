package com.ram.netline_reader_backend.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Extracts Keycloak realm roles from the JWT and maps them to
 * Spring Security {@code ROLE_<name>} authorities.
 *
 * Keycloak JWT structure:
 * <pre>
 * {
 *   "realm_access": {
 *     "roles": ["admin", "staff_ops", ...]
 *   }
 * }
 * </pre>
 *
 * This converter reads {@code realm_access.roles[]} and prefixes each
 * with {@code ROLE_} so Spring Security's {@code hasRole("admin")}
 * checks work correctly.
 */
public class KeycloakRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    @Override
    @SuppressWarnings("unchecked")
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        // Extract the realm_access claim from the JWT
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null || !realmAccess.containsKey("roles")) {
            return Collections.emptyList();
        }

        // Map each Keycloak role to a Spring Security ROLE_ authority
        List<String> roles = (List<String>) realmAccess.get("roles");
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .collect(Collectors.toList());
    }
}
