package com.ram.netline_reader_backend.service.impl;

import com.ram.netline_reader_backend.dto.UserRequestDTO;
import com.ram.netline_reader_backend.dto.UserResponseDTO;
import com.ram.netline_reader_backend.entity.Role;
import com.ram.netline_reader_backend.entity.User;
import com.ram.netline_reader_backend.exception.DuplicateResourceException;
import com.ram.netline_reader_backend.exception.ResourceNotFoundException;
import com.ram.netline_reader_backend.mapper.UserMapper;
import com.ram.netline_reader_backend.repository.UserRepository;
import com.ram.netline_reader_backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Implementation of {@link UserService}.
 * Handles user CRUD with validation, duplicate checks, and partial update support.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    public UserResponseDTO createUser(UserRequestDTO request) {
        // Validate required fields for creation
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

        // Ensure matricule uniqueness
        if (userRepository.existsByMatricule(request.getMatricule())) {
            throw new DuplicateResourceException(
                "User with matricule '" + request.getMatricule() + "' already exists");
        }

        User user = userMapper.toEntity(request);
        User saved = userRepository.save(user);
        return userMapper.toResponseDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
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
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        // Check for duplicate matricule (excluding the current user)
        if (request.getMatricule() != null && !request.getMatricule().isBlank()) {
            userRepository.findByMatricule(request.getMatricule())
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(id)) {
                            throw new DuplicateResourceException(
                                "User with matricule '" + request.getMatricule() + "' already exists");
                        }
                    });
        }

        // Apply partial update (only non-null fields)
        userMapper.updateEntity(user, request);
        User updated = userRepository.save(user);
        return userMapper.toResponseDTO(updated);
    }

    @Override
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    @Override
    public UserResponseDTO resolveFromKeycloak(String keycloakId, Map<String, Object> claims) {
        User user = userRepository.findByKeycloakId(keycloakId)
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

    /**
     * Auto-provision a DB user from Keycloak JWT claims on first login.
     * Extracts preferred_username, name, and realm roles from the token.
     */
    private User autoProvision(String keycloakId, Map<String, Object> claims) {
        String username = (String) claims.getOrDefault("preferred_username", "user");
        String givenName = (String) claims.getOrDefault("given_name", "");
        String familyName = (String) claims.getOrDefault("family_name", "");
        String fullName = (givenName + " " + familyName).trim();
        if (fullName.isEmpty()) fullName = username;

        // Map Keycloak realm roles to the app Role enum
        Role role = Role.OPERATIONAL_STAFF; // safe default
        Object realmAccess = claims.get("realm_access");
        if (realmAccess instanceof Map) {
            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) ((Map<String, Object>) realmAccess).get("roles");
            if (roles != null) {
                if (roles.contains("admin"))            role = Role.ADMIN;
                else if (roles.contains("staff_ops"))   role = Role.OPERATIONAL_STAFF;
                else if (roles.contains("chef_escale")) role = Role.STATION_MANAGER;
                else if (roles.contains("aol_agent"))   role = Role.AOL_AGENT;
            }
        }

        User user = User.builder()
                .keycloakId(keycloakId)
                .matricule(username)       // use Keycloak username as initial matricule
                .fullName(fullName)
                .password("KEYCLOAK_MANAGED") // no local password needed
                .role(role)
                .isActivated(true)
                .build();

        return userRepository.save(user);
    }
}
