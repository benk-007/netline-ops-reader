import React, { useState, useRef } from 'react';
import './AdminPage.css';
import SearchableSelect from '../Filters/SearchableSelect';
import { legs } from '../../data/flightsData';

/* ── Auth roles matching the app auth system ── */
const APP_ROLES = [
    { key: "admin",       label: "Administrateur",  color: "#fca5a5", bg: "rgba(200,16,46,0.12)" },
    { key: "staff_ops",   label: "Staff Ops",       color: "#93c5fd", bg: "rgba(37,99,235,0.12)" },
    { key: "chef_escale", label: "Chef d'Escale",   color: "#6ee7b7", bg: "rgba(5,150,105,0.12)" },
];

/* ── Airport list from real legs data ── */
const ALL_AIRPORTS = [...new Set([
    ...legs.map(l => l.dep),
    ...legs.map(l => l.arr),
])].sort();

/* ── Service colors config ── */
const SERVICE_COLOR_DEFS = [
    { key: "ramRed",     label: "Accent principal (RAM Red)", cssVar: "--ram-red",       default: "#c8102e" },
    { key: "paxBar",     label: "PAX",                       cssVar: "--svc-pax-bar",   default: "#2563eb" },
    { key: "charterBar", label: "Charter",                   cssVar: "--svc-charter-bar", default: "#7c3aed" },
    { key: "cargoBar",   label: "Cargo",                     cssVar: "--svc-cargo-bar", default: "#0891b2" },
    { key: "ferryBar",   label: "Ferry",                     cssVar: "--svc-ferry-bar", default: "#059669" },
    { key: "maintBar",   label: "Maintenance",               cssVar: "--svc-maint-bar", default: "#d97706" },
];

/* ── Helpers ── */
function initials(name) {
    return (name || "??").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function roleInfo(roleKey) {
    return APP_ROLES.find(r => r.key === roleKey) || APP_ROLES[1];
}

/* ── Initial mock users ── */
const INIT_USERS = [
    { id: 1, name: "Ali Idrissi",   username: "ali.idrissi",  role: "admin",       airports: [],                  status: "Active"   },
    { id: 2, name: "Sara Bouzidi",  username: "sara.b",       role: "staff_ops",   airports: [],                  status: "Active"   },
    { id: 3, name: "Mehdi Alami",   username: "mehdi.a",      role: "chef_escale", airports: ["CMN", "RAK"],      status: "Inactive" },
];

/* ══════════════════════════════════════════════════════════ */

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState(INIT_USERS);

    /* ── New / Edit user form ── */
    const [showForm, setShowForm]       = useState(false);
    const [editingId, setEditingId]     = useState(null);
    const [formName, setFormName]       = useState('');
    const [formUsername, setFormUsername] = useState('');
    const [formRole, setFormRole]       = useState('staff_ops');
    const [formAirports, setFormAirports] = useState([]);
    const [formStatus, setFormStatus]   = useState('Active');

    /* ── CSV import ── */
    const csvInputRef = useRef(null);
    const [csvFeedback, setCsvFeedback] = useState('');

    /* ── Theme colors ── */
    const [themeColors, setThemeColors] = useState(
        Object.fromEntries(SERVICE_COLOR_DEFS.map(d => [d.key, d.default]))
    );

    /* ── Form helpers ── */
    function openCreateForm() {
        setEditingId(null);
        setFormName('');
        setFormUsername('');
        setFormRole('staff_ops');
        setFormAirports([]);
        setFormStatus('Active');
        setShowForm(true);
    }

    function openEditForm(user) {
        setEditingId(user.id);
        setFormName(user.name);
        setFormUsername(user.username);
        setFormRole(user.role);
        setFormAirports(user.airports || []);
        setFormStatus(user.status);
        setShowForm(true);
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        if (!formName.trim()) return;
        if (editingId !== null) {
            setUsers(prev => prev.map(u => u.id === editingId
                ? { ...u, name: formName, username: formUsername, role: formRole, airports: formAirports, status: formStatus }
                : u
            ));
        } else {
            setUsers(prev => [...prev, {
                id: Date.now(),
                name: formName,
                username: formUsername || formName.toLowerCase().replace(/\s+/g, '.'),
                role: formRole,
                airports: formAirports,
                status: formStatus,
            }]);
        }
        setShowForm(false);
    }

    /* ── CSV import ── */
    function handleCsvImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = ev.target.result.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length < 2) { setCsvFeedback('Fichier vide.'); return; }
            const [header, ...rows] = lines;
            const cols = header.toLowerCase().split(',').map(s => s.trim());
            const idx = { name: cols.indexOf('name'), username: cols.indexOf('username'), role: cols.indexOf('role'), status: cols.indexOf('status') };
            let imported = 0;
            const newUsers = rows.map(row => {
                const cells = row.split(',').map(s => s.trim());
                const name = idx.name >= 0 ? cells[idx.name] : '';
                if (!name) return null;
                const roleKey = APP_ROLES.find(r => r.label.toLowerCase() === (cells[idx.role] || '').toLowerCase())?.key || 'staff_ops';
                imported++;
                return { id: Date.now() + Math.random(), name, username: cells[idx.username] || name.toLowerCase().replace(/\s+/g, '.'), role: roleKey, airports: [], status: cells[idx.status] === 'Inactive' ? 'Inactive' : 'Active' };
            }).filter(Boolean);
            setUsers(prev => [...prev, ...newUsers]);
            setCsvFeedback(`${imported} utilisateur${imported > 1 ? 's' : ''} importé${imported > 1 ? 's' : ''}`);
            setTimeout(() => setCsvFeedback(''), 3500);
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    /* ── Theme ── */
    function handleThemeChange(key, value, cssVar) {
        setThemeColors(prev => ({ ...prev, [key]: value }));
        document.documentElement.style.setProperty(cssVar, value);
    }

    /* ── Tabs ── */
    const tabs = [
        { id: 'users',  label: 'Utilisateurs' },
        { id: 'roles',  label: 'Rôles & Accès' },
        { id: 'theme',  label: 'Couleurs' },
    ];

    return (
        <div className="admin-page">

            {/* ── Header ── */}
            <header className="admin-header">
                <div className="admin-header-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                </div>
                <div>
                    <h1 className="admin-title">Administration Système</h1>
                    <p className="admin-subtitle">Gestion des accès, rôles et apparence — RAM OPS Center</p>
                </div>
            </header>

            {/* ── Tabs ── */}
            <div className="admin-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="admin-content">

                {/* ══ USERS TAB ══ */}
                {activeTab === 'users' && (
                    <div className="admin-section fade-in">
                        <div className="section-header">
                            <div>
                                <h2>Gestion des utilisateurs</h2>
                                <p className="section-desc">{users.length} compte{users.length > 1 ? 's' : ''} · {users.filter(u => u.status === 'Active').length} actif{users.filter(u => u.status === 'Active').length > 1 ? 's' : ''}</p>
                            </div>
                            <div className="section-header-actions">
                                {csvFeedback && <span className="csv-feedback">{csvFeedback}</span>}
                                <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} />
                                <button className="btn-secondary" onClick={() => csvInputRef.current?.click()}>↑ Import CSV</button>
                                <button className="btn-primary" onClick={openCreateForm}>+ Nouvel utilisateur</button>
                            </div>
                        </div>

                        {/* Create/Edit form */}
                        {showForm && (
                            <form className="admin-form-card slide-down" onSubmit={handleFormSubmit}>
                                <div className="form-card-header">
                                    <h3>{editingId !== null ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}</h3>
                                    <button type="button" className="btn-icon-close" onClick={() => setShowForm(false)}>×</button>
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Nom complet</label>
                                        <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="ex. Ahmed Bertal" required />
                                    </div>
                                    <div className="form-group">
                                        <label>Identifiant</label>
                                        <input type="text" value={formUsername} onChange={e => setFormUsername(e.target.value)} placeholder="ex. ahmed.bertal" />
                                    </div>
                                    <div className="form-group">
                                        <label>Rôle</label>
                                        <select value={formRole} onChange={e => { setFormRole(e.target.value); if (e.target.value !== 'chef_escale') setFormAirports([]); }}>
                                            {APP_ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Statut</label>
                                        <select value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                                            <option value="Active">Actif</option>
                                            <option value="Inactive">Inactif</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Airport assignment — only for chef_escale */}
                                {formRole === 'chef_escale' && (
                                    <div className="form-group" style={{ marginTop: 8 }}>
                                        <label>Aéroports assignés <span className="form-required">*</span></label>
                                        <p className="form-hint">Précisez les aéroports sous la responsabilité de ce Chef d'Escale.</p>
                                        <SearchableSelect
                                            options={ALL_AIRPORTS}
                                            value={formAirports}
                                            onChange={setFormAirports}
                                            placeholder="Rechercher un aéroport..."
                                            multi
                                        />
                                    </div>
                                )}

                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                                    <button
                                        type="submit"
                                        className="btn-submit"
                                        disabled={formRole === 'chef_escale' && formAirports.length === 0}
                                    >
                                        {editingId !== null ? 'Enregistrer' : 'Créer'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* User table */}
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Utilisateur</th>
                                        <th>Rôle</th>
                                        <th>Aéroports</th>
                                        <th>Statut</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => {
                                        const ri = roleInfo(u.role);
                                        return (
                                            <tr key={u.id}>
                                                <td>
                                                    <div className="user-cell">
                                                        <div className="user-avatar" style={{ background: ri.bg, color: ri.color }}>{initials(u.name)}</div>
                                                        <div>
                                                            <div className="fw-600">{u.name}</div>
                                                            <div className="user-username">@{u.username}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="role-pill" style={{ color: ri.color, background: ri.bg, borderColor: `${ri.color}30` }}>
                                                        {ri.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    {u.airports && u.airports.length > 0
                                                        ? <div className="airport-tags">{u.airports.map(a => <span key={a} className="airport-tag">{a}</span>)}</div>
                                                        : <span className="text-dim">—</span>
                                                    }
                                                </td>
                                                <td>
                                                    <div className="status-cell">
                                                        <span className={`status-dot ${u.status === 'Active' ? 'active' : 'inactive'}`} />
                                                        <span className="status-text">{u.status === 'Active' ? 'Actif' : 'Inactif'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="action-btns">
                                                        <button className="btn-text" onClick={() => openEditForm(u)}>Modifier</button>
                                                        <button className="btn-text text-danger" onClick={() => setUsers(users.filter(usr => usr.id !== u.id))}>Révoquer</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {users.length === 0 && (
                                        <tr><td colSpan="5" className="text-center text-muted">Aucun utilisateur.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ ROLES TAB ══ */}
                {activeTab === 'roles' && (
                    <div className="admin-section fade-in">
                        <div className="section-header">
                            <div>
                                <h2>Rôles & Autorisations</h2>
                                <p className="section-desc">Accès définis par rôle système</p>
                            </div>
                        </div>
                        <div className="roles-grid">
                            {[
                                {
                                    role: APP_ROLES[0],
                                    perms: ["Gantt", "Schedule", "Reports", "Admin", "Gestion utilisateurs", "Couleurs & Thème"],
                                },
                                {
                                    role: APP_ROLES[1],
                                    perms: ["Gantt", "Schedule", "Reports"],
                                    denied: ["Admin", "Gestion utilisateurs"],
                                },
                                {
                                    role: APP_ROLES[2],
                                    perms: ["Schedule", "Reports"],
                                    denied: ["Gantt", "Admin"],
                                    note: "Limité aux aéroports assignés",
                                },
                            ].map(({ role, perms, denied, note }) => (
                                <div key={role.key} className="role-card" style={{ borderTopColor: role.color }}>
                                    <div className="role-card-header">
                                        <span className="role-pill" style={{ color: role.color, background: role.bg, borderColor: `${role.color}30` }}>
                                            {role.label}
                                        </span>
                                        <span className="role-user-count">
                                            {users.filter(u => u.role === role.key).length} utilisateur{users.filter(u => u.role === role.key).length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <ul className="role-perms">
                                        {perms.map(p => <li key={p} className="perm-ok">✓ {p}</li>)}
                                        {(denied || []).map(p => <li key={p} className="perm-no">✗ {p}</li>)}
                                    </ul>
                                    {note && <p className="role-note">{note}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ══ THEME / COLORS TAB ══ */}
                {activeTab === 'theme' && (
                    <div className="admin-section fade-in">
                        <div className="section-header">
                            <div>
                                <h2>Personnalisation des couleurs</h2>
                                <p className="section-desc">Modifiez les variables CSS globales en direct</p>
                            </div>
                        </div>
                        <div className="theme-grid">
                            {SERVICE_COLOR_DEFS.map(def => (
                                <div key={def.key} className="theme-card">
                                    <div className="theme-swatch" style={{ background: themeColors[def.key] }} />
                                    <div className="theme-card-body">
                                        <div className="theme-card-label">{def.label}</div>
                                        <div className="color-picker-row">
                                            <input
                                                type="color"
                                                value={themeColors[def.key]}
                                                onChange={e => handleThemeChange(def.key, e.target.value, def.cssVar)}
                                            />
                                            <code className="color-hex">{themeColors[def.key]}</code>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
