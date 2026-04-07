package com.ram.netline_reader_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents an application user (operator, manager, or admin).
 *
 * Each user has a unique matricule (employee ID), a role that drives
 * page-level access, and optional fine-grained permissions.
 *
 * The {@code isActivated} flag allows admins to revoke/restore access
 * without deleting the account (soft disable via the "Révoquer" button).
 *
 * Users can have saved filter profiles persisted via {@link SavedFilter}.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Keycloak subject UUID — the stable bridge between Keycloak identity and this DB record. */
    @Column(name = "keycloak_id", unique = true)
    private String keycloakId;

    /** Unique employee identifier (matricule). */
    @Column(nullable = false, unique = true)
    private String matricule;

    /** Full display name. */
    @Column(name = "full_name", nullable = false)
    private String fullName;

    /** Hashed or plain password (for local auth fallback). */
    @Column(nullable = false)
    private String password;

    /** High-level role controlling page access. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    /** Soft-disable flag — false = account revoked. */
    @Column(name = "is_activated", nullable = false)
    @Builder.Default
    private Boolean isActivated = true;

    /**
     * IATA airport codes this station manager is responsible for (e.g. ["CMN"], ["RAK","AGA"]).
     * A manager can oversee one or several airports simultaneously.
     * All leg queries are scoped to legs where dep OR arr is in this set.
     * Empty for all other roles.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_assigned_airports", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "airport_code", length = 3)
    @Builder.Default
    private List<String> assignedAirports = new ArrayList<>();

    /** Fine-grained permissions (eagerly loaded for auth checks). */
    @ElementCollection(targetClass = Permission.class, fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "user_permissions", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "permission")
    @Builder.Default
    private List<Permission> permissions = new ArrayList<>();

    /** Filter profiles saved by this user. */
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SavedFilter> savedFilters = new ArrayList<>();
}
