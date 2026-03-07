import "./PlaceholderPage.css";

export default function ReportsPage() {
    return (
        <div className="placeholder-page page-fade">
            <div className="placeholder-content">
                <div className="placeholder-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                </div>
                <div className="placeholder-badge">Bientôt disponible</div>
                <h2 className="placeholder-title">Reports & Analytics</h2>
                <p className="placeholder-desc">
                    Le module de rapports opérationnels sera disponible prochainement.<br />
                    Il offrira des analyses de ponctualité, d'utilisation et de performance flotte.
                </p>
                <div className="placeholder-features">
                    {["OTP Report", "Fleet Utilisation", "Delay Analysis", "Export PDF/Excel"].map(f => (
                        <div key={f} className="placeholder-feature">
                            <div className="placeholder-check">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            {f}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
