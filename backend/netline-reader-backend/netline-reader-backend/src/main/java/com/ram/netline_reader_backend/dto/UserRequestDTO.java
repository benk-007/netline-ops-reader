package com.ram.netline_reader_backend.dto;

import com.ram.netline_reader_backend.entity.Permission;
import com.ram.netline_reader_backend.entity.Role;
import lombok.*;

import java.util.List;

/**
 * Request payload for creating or updating a user.
 *
 * All fields are nullable to support partial updates (PATCH semantics via PUT).
 * Required fields for creation are validated in the service layer, not here,
 * because the same DTO is reused for updates where only changed fields are sent.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRequestDTO {

    /** Employee matricule (unique identifier). */
    private String matricule;

    /** Full display name. */
    private String fullName;

    /** Password — optional on update (null = keep existing). */
    private String password;

    /** System role (ADMIN, OPERATIONAL_STAFF, STATION_MANAGER, AOL_AGENT). */
    private Role role;

    /** Fine-grained permission list. */
    private List<Permission> permissions;

    /** Account activation status — false = revoked. */
    private Boolean isActivated;

    /**
     * IATA airport codes this station manager oversees (e.g. ["CMN", "RAK"]).
     * A manager may be responsible for multiple airports simultaneously.
     * All legs for dep or arr matching any of these codes will be visible to the user.
     */
    private List<String> assignedAirports;
}
