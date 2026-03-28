package com.ram.netline_reader_backend.mapper;

import com.ram.netline_reader_backend.dto.UserRequestDTO;
import com.ram.netline_reader_backend.dto.UserResponseDTO;
import com.ram.netline_reader_backend.entity.User;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.stream.Collectors;

/**
 * Maps between {@link User} entities and DTOs.
 * Handles both full creation and partial update semantics.
 */
@Component
public class UserMapper {

    private final SavedFilterMapper savedFilterMapper;

    public UserMapper(SavedFilterMapper savedFilterMapper) {
        this.savedFilterMapper = savedFilterMapper;
    }

    /** Converts a User entity to the API response DTO (password excluded). */
    public UserResponseDTO toResponseDTO(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .keycloakId(user.getKeycloakId())
                .matricule(user.getMatricule())
                .fullName(user.getFullName())
                .role(user.getRole())
                .isActivated(user.getIsActivated())
                .assignedAirport(user.getAssignedAirport())
                .permissions(user.getPermissions())
                .savedFilters(user.getSavedFilters() != null
                        ? user.getSavedFilters().stream()
                            .map(savedFilterMapper::toResponseDTO)
                            .collect(Collectors.toList())
                        : Collections.emptyList())
                .build();
    }

    /** Creates a new User entity from a creation request. */
    public User toEntity(UserRequestDTO dto) {
        return User.builder()
                .matricule(dto.getMatricule())
                .fullName(dto.getFullName())
                .password(dto.getPassword())
                .role(dto.getRole())
                .isActivated(dto.getIsActivated() == null || dto.getIsActivated())
                .assignedAirport(upperOrNull(dto.getAssignedAirport()))
                .permissions(dto.getPermissions() != null ? dto.getPermissions() : Collections.emptyList())
                .build();
    }

    /**
     * Applies partial updates — only non-null / non-blank fields are written.
     * This gives PATCH semantics through a PUT endpoint.
     */
    public void updateEntity(User user, UserRequestDTO dto) {
        if (dto.getMatricule() != null && !dto.getMatricule().isBlank()) {
            user.setMatricule(dto.getMatricule());
        }
        if (dto.getFullName() != null && !dto.getFullName().isBlank()) {
            user.setFullName(dto.getFullName());
        }
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            user.setPassword(dto.getPassword());
        }
        if (dto.getRole() != null) {
            user.setRole(dto.getRole());
        }
        if (dto.getIsActivated() != null) {
            user.setIsActivated(dto.getIsActivated());
        }
        if (dto.getPermissions() != null) {
            user.setPermissions(dto.getPermissions());
        }
        // Explicit null clears the assignment (manager reassigned to no station)
        if (dto.getAssignedAirport() != null) {
            user.setAssignedAirport(upperOrNull(dto.getAssignedAirport()));
        }
    }

    private static String upperOrNull(String code) {
        return (code != null && !code.isBlank()) ? code.trim().toUpperCase() : null;
    }
}
