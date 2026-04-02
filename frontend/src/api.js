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
// Current User API  (identity resolution — Keycloak sub → DB user)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the authenticated Keycloak user to their DB record.
 * Auto-provisions on first login.
 */
export const meApi = {
  /** Get the current user's DB profile (resolved from JWT sub). */
  get: () => request("/me"),
};

// ─────────────────────────────────────────────────────────────────────────────
// Saved Filters API  (any authenticated user — scoped to JWT identity)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CRUD operations for saved filter profiles.
 * All endpoints are scoped to the authenticated user via JWT.
 * No userId is needed — the backend extracts identity from the token.
 */
export const filtersApi = {
  /** Fetch all saved filter profiles for the authenticated user. */
  getMine: () => request("/saved-filters/me"),

  /**
   * Create a new saved filter profile.
   * @param {{ name: string, depAirport?: string[], arrAirport?: string[], serviceType?: string[], aircraftType?: string[], flightNumber?: string[] }} data
   */
  create: (data) => request("/saved-filters", { method: "POST", body: JSON.stringify(data) }),

  /**
   * Update an existing saved filter profile.
   * @param {number} id
   * @param {object} data - Same shape as create payload
   */
  update: (id, data) => request(`/saved-filters/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  /** Delete a saved filter profile by ID. */
  delete: (id) => request(`/saved-filters/${id}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Legs API  (all authenticated users — station-scoped for chef_escale)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read-only flight leg queries — backed by the Oracle MV (prod) or
 * the fake PostgreSQL MV (dev).  Station-scope filtering for the
 * chef_escale role is applied transparently on the backend.
 */
export const legsApi = {
  /**
   * All legs for a specific date — the primary Gantt/Dashboard query.
   * @param {string} date ISO date string, e.g. "2026-03-28"
   */
  getByDate: (date) => request(`/legs?date=${date}`),

  /**
   * All legs within an inclusive date range.
   * @param {string} start ISO date string
   * @param {string} end   ISO date string
   */
  getByDateRange: (start, end) => request(`/legs/range?start=${start}&end=${end}`),

  /**
   * Single leg with full detail (times, load, delays, airports, aircraft).
   * @param {number} legNo
   */
  getByLegNo: (legNo) => request(`/legs/${legNo}`),

  /**
   * Dynamic multi-field search — all params optional.
   * @param {object} params - { flightNumber?, departureAirport?, arrivalAirport?, aircraftRegistration?, legService?, date? }
   */
  search: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== "")
    ).toString();
    return request(`/legs/search${qs ? `?${qs}` : ""}`);
  },

  /** Legs by flight number + date. Maps to GET /api/legs/by-flight?flightNumber=&date= */
  getByFlightAndDate: (flightNumber, date) =>
    request(`/legs/by-flight?flightNumber=${encodeURIComponent(flightNumber)}&date=${date}`),

  /** Legs by departure airport + date. Maps to GET /api/legs/by-departure?airport=&date= */
  getByDeparture: (iata, date) =>
    request(`/legs/by-departure?airport=${encodeURIComponent(iata)}&date=${date}`),

  /** Legs by arrival airport + date. Maps to GET /api/legs/by-arrival?airport=&date= */
  getByArrival: (iata, date) =>
    request(`/legs/by-arrival?airport=${encodeURIComponent(iata)}&date=${date}`),

  /** Legs by aircraft registration + date. Maps to GET /api/legs/by-aircraft?registration=&date= */
  getByAircraft: (registration, date) =>
    request(`/legs/by-aircraft?registration=${encodeURIComponent(registration)}&date=${date}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// SSE — live MV refresh notifications
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Subscribe to MV refresh events from the backend.
 *
 * Opens an SSE connection to GET /api/legs/events.
 * The backend pushes a "mv-refresh" event whenever the fake (or real) MV
 * data changes so the frontend can re-fetch without polling.
 *
 * @param {function} onRefresh  - Called with { timestamp, changedCount, hasChanges }
 * @param {function} [onError]  - Optional error handler
 * @returns {EventSource}       - Call .close() to unsubscribe
 */
export function subscribeToLegEvents(onRefresh, onError) {
  const es = new EventSource("/api/legs/events");

  es.addEventListener("mv-refresh", (e) => {
    try {
      onRefresh(JSON.parse(e.data));
    } catch {
      // ignore malformed payloads
    }
  });

  if (onError) {
    es.onerror = onError;
  }

  return es;
}
