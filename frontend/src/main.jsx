/**
 * Application entry point.
 *
 * Initializes Keycloak authentication before rendering the React app.
 * If Keycloak fails to connect (e.g. running without Docker), the app
 * falls back to the built-in mock login page.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";
import { initKeycloak } from "./auth";
import ToastProvider from "./components/Toast/ToastProvider.jsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const root = createRoot(document.getElementById("root"));

// Try to initialize Keycloak; render the app regardless of the outcome
initKeycloak()
  .then(() => {
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </QueryClientProvider>
      </StrictMode>
    );
  })
  .catch(() => {
    // Keycloak unavailable — render with mock auth fallback
    console.warn("[Auth] Keycloak unavailable — using mock login");
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <App keycloakFailed />
          </ToastProvider>
        </QueryClientProvider>
      </StrictMode>
    );
  });
