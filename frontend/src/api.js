/**
 * API Client for the Netline Reader Backend.
 *
 * All requests include the Keycloak JWT Bearer token for authentication.
 * The base URL is proxied by Vite (dev) or Nginx (production).
 */
import { getToken } from "./auth";

const API_BASE = "/api";

/**
 * Generic fetch wrapper.
 * Automatically attaches the Authorization header and Content-Type.
 * Throws on non-2xx responses with the server error message.
 */
async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }

  // 204 No Content (e.g. after DELETE)
  if (res.status === 204) return null;
  return res.json();
}

/* ── Users API (admin only) ── */
export const usersApi = {
  getAll:  ()          => request("/users"),
  getById: (id)        => request(`/users/${id}`),
  create:  (data)      => request("/users", { method: "POST", body: JSON.stringify(data) }),
  update:  (id, data)  => request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete:  (id)        => request(`/users/${id}`, { method: "DELETE" }),
};

/* ── Saved Filters API (any authenticated user) ── */
export const filtersApi = {
  getByUser: (userId)     => request(`/saved-filters/user/${userId}`),
  create:    (data)       => request("/saved-filters", { method: "POST", body: JSON.stringify(data) }),
  update:    (id, data)   => request(`/saved-filters/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete:    (id)         => request(`/saved-filters/${id}`, { method: "DELETE" }),
};
