/**
 * API Client — Netline Reader Backend
 *
 * Centralised HTTP client for all backend REST calls.
 *
 * Authentication:
 *   Every request automatically injects the Keycloak JWT as an
 *   "Authorization: Bearer <token>" header.  Spring Security validates
 *   the token on every request and returns 401 if it is missing/invalid.
 *
 * Base URL routing (no env var needed):
 *   - Development (Vite):  "/api" → http://localhost:8080/api  (vite.config.js proxy)
 *   - Docker    (Nginx):   "/api" → http://backend:8080/api    (nginx.conf proxy)
 *
 * Error handling:
 *   All methods throw an Error on non-2xx responses so callers can
 *   catch and display the error message.
 */

import { getToken } from "./auth";

/** Relative base — the reverse-proxy rewrites it to the actual host. */
const API_BASE = "/api";

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticated fetch helper.
 *
 * @param {string}      path    - API path, e.g. "/users" or "/saved-filters/1"
 * @param {RequestInit} options - Standard fetch options (method, body, …)
 * @returns {Promise<any>}      - Parsed JSON, or null for 204 No Content
 * @throws  {Error}             - On non-2xx HTTP status
 */
async function request(path, options = {}) {
  const token = getToken(); // Keycloak JWT; undefined when not yet authenticated

  const headers = {
    "Content-Type": "application/json",
    // Attach the Bearer token so Spring Security can validate the JWT.
    // Omitted when the token is undefined — backend will return 401.
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers, // allow callers to add/override individual headers
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    // Surface the backend error message when available
    const body = await res.text().catch(() => "");
    throw new Error(body || res.statusText);
  }

  // 204 No Content — nothing to parse (returned by DELETE endpoints)
  if (res.status === 204) return null;

  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Users API  (admin-only — backend enforces ROLE_admin via @PreAuthorize)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CRUD operations for user accounts.
 * All endpoints require the "admin" Keycloak realm role.
 */
export const usersApi = {
  /** List all user accounts. */
  getAll:  ()         => request("/users"),

  /** Fetch a single user by their database ID. */
  getById: (id)       => request(`/users/${id}`),

  /**
   * Create a new user account.
   * @param {{ fullName: string, matricule: string, password: string, role: string, isActivated?: boolean }} data
   */
  create:  (data)     => request("/users", { method: "POST", body: JSON.stringify(data) }),

  /**
   * Partially update a user — only non-null fields are applied on the backend.
   * @param {number} id
   * @param {{ fullName?, matricule?, password?, role?, isActivated? }} data
   */
  update:  (id, data) => request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  /** Permanently delete a user and all their saved filters. */
  delete:  (id)       => request(`/users/${id}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Saved Filters API  (any authenticated user)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CRUD operations for saved filter profiles.
 * Any authenticated user can manage their own profiles.
 * Backend requires a valid JWT (SecurityConfig: /api/saved-filters/** → authenticated).
 */
export const filtersApi = {
  /**
   * Fetch all saved filter profiles for a given user.
   * @param {number|string} userId - Database ID of the owner
   */
  getByUser: (userId)     => request(`/saved-filters/user/${userId}`),

  /**
   * Create a new saved filter profile.
   * @param {{ name: string, userId: number, depAirport?: string[], arrAirport?: string[], serviceType?: string[], aircraftType?: string[], flightNumber?: string[] }} data
   */
  create:    (data)       => request("/saved-filters", { method: "POST", body: JSON.stringify(data) }),

  /**
   * Update an existing saved filter profile.
   * @param {number} id
   * @param {object} data - Same shape as create payload
   */
  update:    (id, data)   => request(`/saved-filters/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  /** Delete a saved filter profile by ID. */
  delete:    (id)         => request(`/saved-filters/${id}`, { method: "DELETE" }),
};
