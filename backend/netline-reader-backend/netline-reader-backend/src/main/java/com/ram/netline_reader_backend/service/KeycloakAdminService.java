package com.ram.netline_reader_backend.service;

import com.ram.netline_reader_backend.entity.Role;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Manages users in Keycloak via the Admin REST API.
 *
 * Authenticates as a service account (client_credentials or password grant)
 * and provides create / update / delete / role-assignment operations.
 */
@Service
@Slf4j
public class KeycloakAdminService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.keycloak.server-url}")
    private String serverUrl;

    @Value("${app.keycloak.realm}")
    private String realm;

    @Value("${app.keycloak.client-id}")
    private String clientId;

    @Value("${app.keycloak.client-secret:}")
    private String clientSecret;

    @Value("${app.keycloak.admin-username}")
    private String adminUsername;

    @Value("${app.keycloak.admin-password}")
    private String adminPassword;

    // ── Public API ────────────────────────────────────────────

    /**
     * Creates a user in Keycloak, sets their password, and assigns the realm role.
     *
     * @return the Keycloak user UUID
     */
    public String createUser(String username, String firstName, String lastName,
                             String password, Role appRole, boolean enabled) {
        String token = getAdminToken();

        // 1. Create the user
        String usersUrl = adminUrl("/users");

        Map<String, Object> userRep = new LinkedHashMap<>();
        userRep.put("username", username);
        userRep.put("firstName", firstName);
        userRep.put("lastName", lastName);
        userRep.put("enabled", enabled);
        // Keycloak will reject if username already exists (409)

        HttpHeaders headers = bearerHeaders(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<Void> createResp = restTemplate.exchange(
                usersUrl, HttpMethod.POST, new HttpEntity<>(userRep, headers), Void.class);

        if (createResp.getStatusCode() != HttpStatus.CREATED) {
            throw new RuntimeException("Keycloak user creation failed: " + createResp.getStatusCode());
        }

        // 2. Extract the UUID from the Location header
        String locationHeader = createResp.getHeaders().getFirst(HttpHeaders.LOCATION);
        if (locationHeader == null) {
            throw new RuntimeException("Keycloak did not return a Location header");
        }
        String keycloakId = locationHeader.substring(locationHeader.lastIndexOf('/') + 1);

        // 3. Set the password
        setPassword(token, keycloakId, password);

        // 4. Assign the realm role
        assignRealmRole(token, keycloakId, mapAppRoleToKeycloak(appRole));

        log.info("Created Keycloak user '{}' with id={}", username, keycloakId);
        return keycloakId;
    }

    /**
     * Updates user attributes in Keycloak (name, enabled status).
     * If role changed, removes old realm roles and assigns the new one.
     * If password is provided, resets it.
     */
    public void updateUser(String keycloakId, String firstName, String lastName,
                           String password, Role appRole, boolean enabled) {
        String token = getAdminToken();

        // 1. Update basic attributes
        String userUrl = adminUrl("/users/" + keycloakId);

        Map<String, Object> userRep = new LinkedHashMap<>();
        // username is read-only in Keycloak 24+ after creation — do not send it
        if (firstName != null) userRep.put("firstName", firstName);
        if (lastName != null) userRep.put("lastName", lastName);
        userRep.put("enabled", enabled);

        HttpHeaders headers = bearerHeaders(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        restTemplate.exchange(userUrl, HttpMethod.PUT, new HttpEntity<>(userRep, headers), Void.class);

        // 2. Reset password if provided
        if (password != null && !password.isBlank() && !"KEYCLOAK_MANAGED".equals(password)) {
            setPassword(token, keycloakId, password);
        }

        // 3. Update realm role — remove all app roles then assign the new one
        if (appRole != null) {
            removeAllAppRealmRoles(token, keycloakId);
            assignRealmRole(token, keycloakId, mapAppRoleToKeycloak(appRole));
        }

        log.info("Updated Keycloak user id={}", keycloakId);
    }

    /**
     * Deletes a user from Keycloak.
     */
    public void deleteUser(String keycloakId) {
        String token = getAdminToken();
        String userUrl = adminUrl("/users/" + keycloakId);

        HttpHeaders headers = bearerHeaders(token);
        restTemplate.exchange(userUrl, HttpMethod.DELETE, new HttpEntity<>(headers), Void.class);

        log.info("Deleted Keycloak user id={}", keycloakId);
    }

    // ── Internal helpers ──────────────────────────────────────

    /**
     * Obtains an admin access token from Keycloak using the password grant
     * on the master realm (or client_credentials if a client secret is set).
     */
    private String getAdminToken() {
        String tokenUrl;
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();

        if (clientSecret != null && !clientSecret.isBlank()) {
            // Client credentials grant on the target realm
            tokenUrl = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";
            form.add("grant_type", "client_credentials");
            form.add("client_id", clientId);
            form.add("client_secret", clientSecret);
        } else {
            // Password grant on the master realm (admin user)
            tokenUrl = serverUrl + "/realms/master/protocol/openid-connect/token";
            form.add("grant_type", "password");
            form.add("client_id", clientId);
            form.add("username", adminUsername);
            form.add("password", adminPassword);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
                tokenUrl, HttpMethod.POST, new HttpEntity<>(form, headers),
                new ParameterizedTypeReference<>() {});

        if (resp.getBody() == null || !resp.getBody().containsKey("access_token")) {
            throw new RuntimeException("Failed to obtain Keycloak admin token");
        }
        return (String) resp.getBody().get("access_token");
    }

    private void setPassword(String token, String keycloakId, String password) {
        String url = adminUrl("/users/" + keycloakId + "/reset-password");

        Map<String, Object> cred = new LinkedHashMap<>();
        cred.put("type", "password");
        cred.put("value", password);
        cred.put("temporary", false);

        HttpHeaders headers = bearerHeaders(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        restTemplate.exchange(url, HttpMethod.PUT, new HttpEntity<>(cred, headers), Void.class);
    }

    private void assignRealmRole(String token, String keycloakId, String roleName) {
        // 1. Get the role representation from Keycloak
        Map<String, Object> roleRep = getRealmRole(token, roleName);
        if (roleRep == null) {
            log.warn("Keycloak realm role '{}' does not exist — skipping assignment", roleName);
            return;
        }

        // 2. Assign it to the user
        String url = adminUrl("/users/" + keycloakId + "/role-mappings/realm");

        HttpHeaders headers = bearerHeaders(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        restTemplate.exchange(url, HttpMethod.POST,
                new HttpEntity<>(List.of(roleRep), headers), Void.class);
    }

    private void removeAllAppRealmRoles(String token, String keycloakId) {
        String[] appRoles = {"admin", "staff_ops", "chef_escale", "aol_agent"};

        // Get the user's current realm role mappings
        String url = adminUrl("/users/" + keycloakId + "/role-mappings/realm");
        HttpHeaders headers = bearerHeaders(token);

        ResponseEntity<List<Map<String, Object>>> resp = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers),
                new ParameterizedTypeReference<>() {});

        if (resp.getBody() == null) return;

        Set<String> appRoleSet = Set.of(appRoles);
        List<Map<String, Object>> toRemove = resp.getBody().stream()
                .filter(r -> appRoleSet.contains(r.get("name")))
                .toList();

        if (!toRemove.isEmpty()) {
            restTemplate.exchange(url, HttpMethod.DELETE,
                    new HttpEntity<>(toRemove, headers), Void.class);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getRealmRole(String token, String roleName) {
        String url = adminUrl("/roles/" + roleName);
        HttpHeaders headers = bearerHeaders(token);
        try {
            ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers),
                    new ParameterizedTypeReference<>() {});
            return resp.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            return null;
        }
    }

    private String adminUrl(String path) {
        return serverUrl + "/admin/realms/" + realm + path;
    }

    private HttpHeaders bearerHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    /**
     * Maps the application Role enum to the corresponding Keycloak realm role name.
     */
    private String mapAppRoleToKeycloak(Role appRole) {
        return switch (appRole) {
            case ADMIN -> "admin";
            case OPERATIONAL_STAFF -> "staff_ops";
            case STATION_MANAGER -> "chef_escale";
            case AOL_AGENT -> "aol_agent";
        };
    }
}
