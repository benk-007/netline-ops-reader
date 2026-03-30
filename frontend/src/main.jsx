/**
 * Application entry point.
 *
 * Initializes Keycloak authentication before rendering the React app.
 * If Keycloak fails to connect (e.g. running without Docker), the app
 * falls back to the built-in mock login page.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initKeycloak } from "./auth";

const root = createRoot(document.getElementById("root"));

const renderMockFallback = () => {
  console.warn("[Auth] Keycloak unavailable — using mock login");
  root.render(
    <StrictMode>
      <App keycloakFailed />
    </StrictMode>
  );
};

// Race Keycloak init against a 4-second timeout so that when Keycloak is
// not running (e.g. local dev without Docker) the mock login appears
// immediately instead of the browser hanging on a redirect.
const keycloakTimeout = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("keycloak-timeout")), 4000)
);

Promise.race([initKeycloak(), keycloakTimeout])
  .then(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  })
  .catch(renderMockFallback);
