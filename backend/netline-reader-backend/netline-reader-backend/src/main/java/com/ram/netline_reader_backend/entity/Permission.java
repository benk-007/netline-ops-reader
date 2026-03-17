package com.ram.netline_reader_backend.entity;

/**
 * Fine-grained permissions that can be assigned to individual users.
 * Used alongside {@link Role} for granular access control.
 *
 * MANAGE_USERS       — create, update, delete, activate/deactivate users
 * VIEW_GLOBAL_GANTT  — see the full airline-wide Gantt chart
 * VIEW_STATION_ONLY  — restricted to assigned station airports
 * EDIT_SYSTEM_CONFIG — change theme, colors, and system settings
 */
public enum Permission {
    MANAGE_USERS,
    VIEW_GLOBAL_GANTT,
    VIEW_STATION_ONLY,
    EDIT_SYSTEM_CONFIG
}
