import "./PlaceholderPage.css";

export default function SchedulePage() {
    return (
        <div className="placeholder-page page-fade">
            <div className="placeholder-content">
                <div className="placeholder-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                    </svg>
                </div>
                <div className="placeholder-badge">Bientôt disponible</div>
                <h2 className="placeholder-title">Schedule Manager</h2>
                <p className="placeholder-desc">
                    La vue de planification des rotations sera disponible prochainement.<br />
                    Elle permettra de gérer les créneaux, les affectations et les rotations d'équipage.
                </p>
                <div className="placeholder-features">
                    {["Vue hebdomadaire", "Affectation d'équipage", "Gestion des créneaux", "Import OAG"].map(f => (
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
