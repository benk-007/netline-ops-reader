/**
 * Keycloak Authentication Service
 *
 * Initializes the Keycloak JS adapter and provides helpers for:
 *  - Login / logout
 *  - Getting the current JWT access token
 *  - Extracting user info and roles from the token
 *  - Automatic token refresh
 *
 * Configuration is loaded from environment variables (Vite):
 *  - VITE_KEYCLOAK_URL     (default: http://localhost:9090)
 *  - VITE_KEYCLOAK_REALM   (default: netline-reader)
 *  - VITE_KEYCLOAK_CLIENT  (default: netline-frontend)
 */
import Keycloak from "keycloak-js";

/* ── Keycloak instance (singleton) ── */
const keycloak = new Keycloak({
  url:      import.meta.env.VITE_KEYCLOAK_URL    || "http://localhost:9090",
  realm:    import.meta.env.VITE_KEYCLOAK_REALM   || "netline-reader",
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT  || "netline-frontend",
});

/**
 * Initialize Keycloak and redirect to login if not authenticated.
 * Returns a promise that resolves to true once the user is logged in.
 */
export async function initKeycloak() {
  const authenticated = await keycloak.init({
    onLoad: "login-required",       // redirect to Keycloak login page if not authenticated
    checkLoginIframe: false,         // disable iframe-based session checks (avoids CORS issues)
    pkceMethod: "S256",              // PKCE for public clients (recommended security)
  });

  // Set up automatic token refresh (every 30s, refreshes if < 60s remaining)
  if (authenticated) {
    setInterval(() => {
      keycloak.updateToken(60).catch(() => {
        keycloak.logout();
      });
    }, 30000);
  }

  return authenticated;
}

/** Get the current access token (for Authorization: Bearer header). */
export function getToken() {
  return keycloak.token;
}

/** Get the Keycloak instance (for advanced usage). */
export function getKeycloak() {
  return keycloak;
}

/** Logout and redirect to the app root. */
export function logout() {
  keycloak.logout({ redirectUri: window.location.origin });
}

/**
 * Extract user info from the Keycloak token.
 * Maps Keycloak realm roles to the app's frontend role system:
 *   "admin"       -> "admin"
 *   "staff_ops"   -> "staff_ops"
 *   "chef_escale" -> "chef_escale"
 *   "aol_agent"   -> "aol_agent"
 */
export function getUserInfo() {
  if (!keycloak.tokenParsed) return null;

  const tp = keycloak.tokenParsed;
  const roles = tp.realm_access?.roles || [];

  // Determine the primary app role (first match wins, priority order)
  let role = "staff_ops";
  if (roles.includes("admin"))       role = "admin";
  else if (roles.includes("staff_ops"))   role = "staff_ops";
  else if (roles.includes("chef_escale")) role = "chef_escale";
  else if (roles.includes("aol_agent"))   role = "aol_agent";

  const displayName = [tp.given_name, tp.family_name].filter(Boolean).join(" ")
    || tp.preferred_username
    || "User";

  const initials = displayName
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id:          tp.sub,
    name:        tp.preferred_username,
    displayName,
    initials,
    role,
    email:       tp.email || "",
    roles,
  };
}
