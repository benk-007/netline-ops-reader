package com.ram.netline_reader_backend.service;

import com.ram.netline_reader_backend.dto.UserRequestDTO;
import com.ram.netline_reader_backend.dto.UserResponseDTO;
import com.ram.netline_reader_backend.entity.User;

import java.util.List;
import java.util.Map;

/**
 * Service contract for user management operations.
 * All methods are admin-only (enforced at the controller level via RBAC).
 */
public interface UserService {

    /** Create a new user. Validates required fields and checks for duplicate matricule. */
    UserResponseDTO createUser(UserRequestDTO request);

    /** Fetch a single user by ID. */
    UserResponseDTO getUserById(Long id);

    /** Fetch all users in the system. */
    List<UserResponseDTO> getAllUsers();

    /** Partially update a user. Only non-null fields in the request are applied. */
    UserResponseDTO updateUser(Long id, UserRequestDTO request);

    /** Permanently delete a user and their saved filters. */
    void deleteUser(Long id);

    /**
     * Resolve a Keycloak user to their DB record.
     * If no user exists for this keycloakId (sub), auto-provision one.
     *
     * @param keycloakId the JWT "sub" claim (stable UUID)
     * @param claims     the full JWT claims (for extracting name, username, roles)
     */
    UserResponseDTO resolveFromKeycloak(String keycloakId, Map<String, Object> claims);

    /**
     * Get the User entity for the given keycloakId (used internally by filter service).
     */
    User getUserByKeycloakId(String keycloakId);
}
