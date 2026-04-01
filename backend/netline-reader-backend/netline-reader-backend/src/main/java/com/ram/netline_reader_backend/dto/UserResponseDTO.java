package com.ram.netline_reader_backend.dto;

import com.ram.netline_reader_backend.entity.Permission;
import com.ram.netline_reader_backend.entity.Role;
import lombok.*;

import java.util.List;

/**
 * Response payload returned when fetching user data.
 * Excludes the password for security.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponseDTO {

    private Long id;
    private String keycloakId;
    private String matricule;
    private String fullName;
    private Role role;
    private Boolean isActivated;
    private List<Permission> permissions;
    private List<SavedFilterResponseDTO> savedFilters;

    /** IATA codes of the airports this station manager oversees. Empty list for other roles. */
    private List<String> assignedAirports;
}
