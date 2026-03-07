import { legs } from "../../data/flightsData";
import { SERVICE_COLORS, STATE_COLORS } from "../../constants/ganttConstants";
import "./DashboardPage.css";

function StatCard({ label, value, sub, color, icon }) {
    return (
        <div className="stat-card" style={{ "--accent": color }}>
            <div className="stat-icon">{icon}</div>
            <div className="stat-body">
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
                {sub && <div className="stat-sub">{sub}</div>}
            </div>
        </div>
    );
}

function ServiceRow({ service, count, color }) {
    const total = legs.length;
    const pct = Math.round((count / total) * 100);
    return (
        <div className="svc-row">
            <div className="svc-dot" style={{ background: color }} />
            <span className="svc-name">{service}</span>
            <div className="svc-bar-wrap">
                <div className="svc-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="svc-count">{count}</span>
        </div>
    );
}

export default function DashboardPage() {
    const total = legs.length;
    const delayed = legs.filter(l => l.delay > 0).length;
    const onTime = total - delayed;
    const services = Object.entries(
        legs.reduce((acc, l) => { acc[l.service] = (acc[l.service] || 0) + 1; return acc; }, {})
    );

    return (
        <div className="dashboard-page page-fade">
            <div className="dashboard-header">
                <div>
                    <h1 className="dash-title">Dashboard Opérationnel</h1>
                    <p className="dash-sub">Royal Air Maroc · Vue d'ensemble des rotations</p>
                </div>
                <div className="dash-date-badge">
                    <span>2026-03-05</span>
                    <span className="live-dot" />
                    <span>LIVE</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <StatCard
                    label="Vols Totaux"
                    value={total}
                    sub="Aujourd'hui"
                    color="var(--ram-red)"
                    icon={<PlaneIcon />}
                />
                <StatCard
                    label="À l'heure"
                    value={onTime}
                    sub={`${Math.round((onTime / total) * 100)}% ponctualité`}
                    color="var(--state-arrived)"
                    icon={<CheckIcon />}
                />
                <StatCard
                    label="Retardés"
                    value={delayed}
                    sub={delayed > 0 ? "Attention requise" : "Aucun retard"}
                    color={delayed > 0 ? "var(--state-delayed)" : "var(--state-arrived)"}
                    icon={<AlertIcon />}
                />
                <StatCard
                    label="Appareils"
                    value={[...new Set(legs.map(l => l.reg))].length}
                    sub="Enregistrements actifs"
                    color="var(--svc-cargo-bar)"
                    icon={<AircraftIcon />}
                />
            </div>

            {/* Service breakdown */}
            <div className="dash-section">
                <div className="dash-section-title">Répartition par service</div>
                <div className="svc-list">
                    {services.map(([svc, count]) => (
                        <ServiceRow
                            key={svc}
                            service={svc}
                            count={count}
                            color={SERVICE_COLORS[svc]?.bar || "#64748b"}
                        />
                    ))}
                </div>
            </div>

            {/* Fleet table */}
            <div className="dash-section">
                <div className="dash-section-title">Flotte active</div>
                <div className="fleet-table">
                    <div className="fleet-header">
                        <span>Immat.</span><span>Type</span><span>Vols</span><span>Statut</span>
                    </div>
                    {[...new Set(legs.map(l => l.reg))].map(reg => {
                        const regLegs = legs.filter(l => l.reg === reg);
                        return (
                            <div key={reg} className="fleet-row">
                                <span className="fleet-reg">{reg}</span>
                                <span>{regLegs[0].subtype}</span>
                                <span>{regLegs.length}</span>
                                <span className="fleet-state" style={{ color: STATE_COLORS[regLegs[0].state] }}>
                                    {regLegs[0].state}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ── Inline SVG icons ── */
function PlaneIcon() {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-.7 1.1l2 4.5c.2.4.6.6 1 .6H8l-1 2.5c-.1.3 0 .7.3.9l2 1.4c.3.2.7.2 1-.1l1.5-1.5 4.5 2c.6.2 1-.2 1.1-.7z" /></svg>;
}
function CheckIcon() {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function AlertIcon() {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="10.29 3.86 1.82 18 22.18 18" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
}
function AircraftIcon() {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>;
}
