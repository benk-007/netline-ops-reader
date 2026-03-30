import { useState } from "react";
import "./LoginPage.css";

/* ── Mock user database ──────────────────────────────────────────── */
const USERS = [
  { username: "admin", password: "admin123", role: "admin",       displayName: "Admin System",    initials: "AD" },
  { username: "ops",   password: "ops123",   role: "staff_ops",   displayName: "Staff Ops",       initials: "OP" },
  { username: "chef",  password: "chef123",  role: "chef_escale", displayName: "Chef d'Escale",   initials: "CE", assignedAirports: ["CMN"] },
];

const DEMO_ROWS = [
  { user: "admin", pass: "admin123", role: "admin" },
  { user: "ops",   pass: "ops123",   role: "staff_ops" },
  { user: "chef",  pass: "chef123",  role: "chef_escale" },
];

const BADGE_LABELS = {
  admin:       "Admin",
  staff_ops:   "Staff Ops",
  chef_escale: "Chef d'Escale",
};

/* ── Icons ───────────────────────────────────────────────────────── */
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────────── */
export default function LoginPage({ onLogin }) {
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [showDemo, setShowDemo]   = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    /* Simulate async auth (200ms) */
    setTimeout(() => {
      const user = USERS.find(
        u => u.username === username.trim().toLowerCase() && u.password === password
      );

      if (user) {
        onLogin({ name: user.username, displayName: user.displayName, role: user.role, initials: user.initials, assignedAirports: user.assignedAirports || [] });
      } else {
        setError("Identifiant ou mot de passe incorrect.");
        setLoading(false);
      }
    }, 200);
  }

  function fillDemo(user, pass) {
    setUsername(user);
    setPassword(pass);
    setError("");
    setShowDemo(false);
  }

  return (
    <div className="login-root">
      {/* Animated BG */}
      <div className="login-bg" />
      <div className="login-glow-1" />
      <div className="login-glow-2" />

      {/* Card */}
      <div className="login-card">

        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">RAM</div>
          <div>
            <div className="login-brand-title">Operations Center</div>
            <div className="login-brand-sub">Royal Air Maroc · Flight Ops</div>
          </div>
        </div>

        <div className="login-divider" />

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} autoComplete="off">

          {/* Username */}
          <div className="login-field">
            <label className="login-label">Identifiant</label>
            <div className="login-input-wrap">
              <span className="login-input-icon"><UserIcon /></span>
              <input
                className="login-input"
                type="text"
                placeholder="Entrez votre identifiant"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label className="login-label">Mot de passe</label>
            <div className="login-input-wrap">
              <span className="login-input-icon"><LockIcon /></span>
              <input
                className="login-input"
                type={showPass ? "text" : "password"}
                placeholder="Entrez votre mot de passe"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
                aria-label={showPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                <EyeIcon open={showPass} />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="login-error">
              <AlertIcon />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="login-btn"
            disabled={loading || !username || !password}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="login-demo">
          <button
            type="button"
            className="login-demo-toggle"
            onClick={() => setShowDemo(v => !v)}
          >
            <span>Comptes de démonstration</span>
            <span className={`login-demo-toggle-icon ${showDemo ? "open" : ""}`}>
              <ChevronIcon />
            </span>
          </button>

          {showDemo && (
            <div className="login-demo-rows">
              {DEMO_ROWS.map(row => (
                <div
                  key={row.role}
                  className="login-demo-row"
                  onClick={() => fillDemo(row.user, row.pass)}
                  title="Cliquer pour remplir"
                >
                  <span className="login-demo-user">{row.user}</span>
                  <span className="login-demo-pass">{row.pass}</span>
                  <span className={`login-demo-badge ${row.role}`}>
                    {BADGE_LABELS[row.role]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="login-footer">
          Système réservé au personnel autorisé · RAM © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
