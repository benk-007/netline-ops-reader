package com.ram.netline_reader_backend.service.impl;

import com.ram.netline_reader_backend.dto.UserRequestDTO;
import com.ram.netline_reader_backend.dto.UserResponseDTO;
import com.ram.netline_reader_backend.entity.Role;
import com.ram.netline_reader_backend.entity.User;
import com.ram.netline_reader_backend.exception.DuplicateResourceException;
import com.ram.netline_reader_backend.exception.ResourceNotFoundException;
import com.ram.netline_reader_backend.mapper.UserMapper;
import com.ram.netline_reader_backend.repository.UserRepository;
import com.ram.netline_reader_backend.service.KeycloakAdminService;
import com.ram.netline_reader_backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Implementation of {@link UserService}.
 *
 * On create / update / delete the service first pushes the change to
 * Keycloak (via {@link KeycloakAdminService}) and then persists the
 * local DB record.  This ensures every user managed from the app
 * interface is immediately visible in Keycloak and can authenticate.
 *
 * On login ({@link #resolveFromKeycloak}), changes made directly in
 * Keycloak (role, name) are synced back to the local DB via the JWT claims.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class UserServiceImpl implements UserService {

    private static final String KEYCLOAK_MANAGED_PASSWORD = "KEYCLOAK_MANAGED";
    private static final String USER_NOT_FOUND = "User not found with id: ";

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final KeycloakAdminService keycloakAdminService;

    @Override
    public UserResponseDTO createUser(UserRequestDTO request) {
        // ── Validate required fields ──────────────────────────────
        if (request.getMatricule() == null || request.getMatricule().isBlank()) {
            throw new IllegalArgumentException("Matricule is required");
        }
        if (request.getFullName() == null || request.getFullName().isBlank()) {
            throw new IllegalArgumentException("Full name is required");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (request.getRole() == null) {
            throw new IllegalArgumentException("Role is required");
        }

        // ── Uniqueness check (local DB) ───────────────────────────
        if (userRepository.existsByMatricule(request.getMatricule())) {
            throw new DuplicateResourceException(
                "User with matricule '" + request.getMatricule() + "' already exists");
        }

        // ── Split fullName into first / last for Keycloak ─────────
        String[] nameParts = splitName(request.getFullName());

        // ── 1. Create user in Keycloak (username = matricule) ─────
        String keycloakId = keycloakAdminService.createUser(
                request.getMatricule(),           // username
                nameParts[0],                     // firstName
                nameParts[1],                     // lastName
                request.getPassword(),
                request.getRole(),
                request.getIsActivated() == null || request.getIsActivated()
        );

        // ── 2. Persist in local DB with the Keycloak UUID ────────
        User user = userMapper.toEntity(request);
        user.setKeycloakId(keycloakId);
        user.setPassword(KEYCLOAK_MANAGED_PASSWORD);
        User saved = userRepository.save(user);

        if (Role.STATION_MANAGER == request.getRole()
                && (request.getAssignedAirports() == null || request.getAssignedAirports().isEmpty())) {
            log.warn("Station manager matricule='{}' created without any assignedAirports — leg visibility will be unrestricted",
                    request.getMatricule());
        }

        log.info("Created user matricule='{}' role={} keycloakId={}",
                request.getMatricule(), request.getRole(), keycloakId);
        return userMapper.toResponseDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND + id));
        return userMapper.toResponseDTO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponseDTO updateUser(Long id, UserRequestDTO request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND + id));

        // ── Duplicate matricule check ─────────────────────────────
        if (request.getMatricule() != null && !request.getMatricule().isBlank()) {
            userRepository.findByMatricule(request.getMatricule())
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(id)) {
                            throw new DuplicateResourceException(
                                "User with matricule '" + request.getMatricule() + "' already exists");
                        }
                    });
        }

        // ── Sync to Keycloak if the user is linked ───────────────
        if (user.getKeycloakId() != null) {
            String fullName = request.getFullName() != null ? request.getFullName() : user.getFullName();
            String[] nameParts = splitName(fullName);

            keycloakAdminService.updateUser(
                    user.getKeycloakId(),
                    nameParts[0],                                                  // firstName
                    nameParts[1],                                                  // lastName
                    request.getPassword(),                                         // null = no change
                    request.getRole() != null ? request.getRole() : user.getRole(),
                    request.getIsActivated() != null ? request.getIsActivated() : user.getIsActivated()
            );
        }

        // ── Update local DB ──────────────────────────────────────
        userMapper.updateEntity(user, request);
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(KEYCLOAK_MANAGED_PASSWORD);
        }
        User updated = userRepository.save(user);
        return userMapper.toResponseDTO(updated);
    }

    @Override
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND + id));

        // ── Remove from Keycloak first ────────────────────────────
        if (user.getKeycloakId() != null) {
            keycloakAdminService.deleteUser(user.getKeycloakId());
        }

        userRepository.deleteById(id);
        log.info("Deleted user id={} keycloakId={}", id, user.getKeycloakId());
    }

    @Override
    public UserResponseDTO resolveFromKeycloak(String keycloakId, Map<String, Object> claims) {
        User user = userRepository.findByKeycloakId(keycloakId)
                .map(existing -> syncFromToken(existing, claims))
                .orElseGet(() -> autoProvision(keycloakId, claims));
        return userMapper.toResponseDTO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public User getUserByKeycloakId(String keycloakId) {
        return userRepository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "No user linked to Keycloak ID: " + keycloakId));
    }

    // ── Private helpers ───────────────────────────────────────

    /**
     * Syncs the DB user with the latest JWT claims from Keycloak.
     * Called on every login so that role/name changes made in
     * Keycloak admin console are reflected in the local DB.
     */
    private User syncFromToken(User user, Map<String, Object> claims) {
        boolean changed = false;

        // Sync full name
        String givenName = (String) claims.getOrDefault("given_name", "");
        String familyName = (String) claims.getOrDefault("family_name", "");
        String fullName = (givenName + " " + familyName).trim();
        if (!fullName.isEmpty() && !fullName.equals(user.getFullName())) {
            user.setFullName(fullName);
            changed = true;
        }

        // Sync role from Keycloak realm_access
        Role tokenRole = extractRoleFromClaims(claims);
        if (tokenRole != null && tokenRole != user.getRole()) {
            user.setRole(tokenRole);
            changed = true;
        }

        if (changed) {
            user = userRepository.save(user);
            log.info("Synced DB user id={} from Keycloak token (role={}, name={})",
                    user.getId(), user.getRole(), user.getFullName());
        }
        return user;
    }

    /**
     * Extracts the app Role from JWT realm_access claims.
     */
    private Role extractRoleFromClaims(Map<String, Object> claims) {
        Object realmAccess = claims.get("realm_access");
        if (realmAccess instanceof Map) {
            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) ((Map<String, Object>) realmAccess).get("roles");
            if (roles != null) {
                if (roles.contains("admin"))            return Role.ADMIN;
                else if (roles.contains("staff_ops"))   return Role.OPERATIONAL_STAFF;
                else if (roles.contains("chef_escale")) return Role.STATION_MANAGER;
                else if (roles.contains("aol_agent"))   return Role.AOL_AGENT;
            }
        }
        return null;
    }

    /**
     * Auto-provision a DB user from Keycloak JWT claims on first login.
     */
    private User autoProvision(String keycloakId, Map<String, Object> claims) {
        String username = (String) claims.getOrDefault("preferred_username", "user");
        String givenName = (String) claims.getOrDefault("given_name", "");
        String familyName = (String) claims.getOrDefault("family_name", "");
        String fullName = (givenName + " " + familyName).trim();
        if (fullName.isEmpty()) fullName = username;

        Role role = extractRoleFromClaims(claims);
        if (role == null) role = Role.OPERATIONAL_STAFF;

        User user = User.builder()
                .keycloakId(keycloakId)
                .matricule(username)
                .fullName(fullName)
                .password(KEYCLOAK_MANAGED_PASSWORD)
                .role(role)
                .isActivated(true)
                .build();

        return userRepository.save(user);
    }

    /**
     * Splits "John Doe" into ["John", "Doe"].
     * If only one word, lastName is empty.
     */
    private String[] splitName(String fullName) {
        if (fullName == null || fullName.isBlank()) return new String[]{"", ""};
        String[] parts = fullName.trim().split("\\s+", 2);
        return new String[]{parts[0], parts.length > 1 ? parts[1] : ""};
    }
}
