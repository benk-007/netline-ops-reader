package com.ram.netline_reader_backend.entity;

/**
 * System roles that define a user's access level.
 * These map to Keycloak realm roles and control which pages/features
 * the user can access in both the backend (RBAC) and frontend (nav guards).
 *
 * Mapping to Keycloak roles:
 *   ADMIN            -> "admin"          (full access, user management)
 *   OPERATIONAL_STAFF -> "staff_ops"     (gantt, schedule, reports)
 *   STATION_MANAGER  -> "chef_escale"    (schedule, reports — station-scoped)
 *   AOL_AGENT        -> "aol_agent"      (limited operational view)
 */
public enum Role {
    OPERATIONAL_STAFF,
    STATION_MANAGER,
    ADMIN,
    AOL_AGENT
}
