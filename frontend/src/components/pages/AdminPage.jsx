import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './AdminPage.css';
import SearchableSelect from '../Filters/SearchableSelect';
import { legs, Leg } from '../../data/flightsData';
import { usersApi } from '../../api';

/* ── Auth roles matching the app auth system ── */
const APP_ROLES = [
    { key: "admin",       label: "Administrateur",  color: "#fca5a5", bg: "rgba(200,16,46,0.12)", backendRole: "ADMIN" },
    { key: "staff_ops",   label: "Staff Ops",       color: "#93c5fd", bg: "rgba(37,99,235,0.12)", backendRole: "OPERATIONAL_STAFF" },
    { key: "chef_escale", label: "Chef d'Escale",   color: "#6ee7b7", bg: "rgba(5,150,105,0.12)", backendRole: "STATION_MANAGER" },
    { key: "aol_agent",   label: "Agent AOL",       color: "#c4b5fd", bg: "rgba(124,58,237,0.12)", backendRole: "AOL_AGENT" },
];

function frontendRole(backendRole) {
    return APP_ROLES.find(r => r.backendRole === backendRole)?.key || "staff_ops";
}

function backendRole(frontendKey) {
    return APP_ROLES.find(r => r.key === frontendKey)?.backendRole || "OPERATIONAL_STAFF";
}

/* ── Airport list from real legs data ── */
const ALL_AIRPORTS = [...new Set([
    ...legs.map(l => l.dep),
    ...legs.map(l => l.arr),
])].sort();

/* ── Planned / Actual bar colors config ── */
const BAR_COLOR_DEFS = [
    { key: "legPlanned",     label: "Planifié (Bleu)",           cssVar: "--leg-planned",        default: "#2563eb" },
    { key: "legActual",      label: "Actuel (Gris)",             cssVar: "--leg-actual",         default: "#6b7280" },
    { key: "legMaintPlan",   label: "Maintenance Planifié (Jaune)", cssVar: "--leg-maint-planned", default: "#d97706" },
    { key: "legMaintActual", label: "Maintenance Actuel",        cssVar: "--leg-maint-actual",   default: "#b45309" },
    { key: "legFActual",     label: "F Actuel (Rose)",           cssVar: "--leg-f-actual",       default: "#f9a8d4" },
    { key: "ramRed",         label: "Accent principal (RAM Red)", cssVar: "--ram-red",            default: "#c8102e" },
];

/* ── State colors config ── */
const STATE_COLOR_DEFS = [
    { key: "arrived",   label: "Arrivé (Arrived)",     cssVar: "--state-arrived",   default: "#22c55e" },
    { key: "airborne",  label: "En vol (Airborne)",    cssVar: "--state-airborne",  default: "#3b82f6" },
    { key: "boarding",  label: "Embarquement",         cssVar: "--state-boarding",  default: "#f59e0b" },
    { key: "delayed",   label: "Retardé (Delayed)",    cssVar: "--state-delayed",   default: "#ef4444" },
    { key: "scheduled", label: "Programmé (Scheduled)", cssVar: "--state-scheduled", default: "#808b99" },
    { key: "cancelled", label: "Annulé (Cancelled)",   cssVar: "--state-cancelled", default: "#64748b" },
];

/* ── Helpers ── */
function initials(name) {
    return (name || "??").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function roleInfo(roleKey) {
    return APP_ROLES.find(r => r.key === roleKey) || APP_ROLES[1];
}

/* ══════════════════════════════════════════════════════════ */

export default function AdminPage({ onLegsImported }) {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    /* ── Fetch users from backend ── */
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await usersApi.getAll();
            setUsers(data.map(u => ({
                id: u.id,
                name: u.fullName,
                username: u.matricule,
                role: frontendRole(u.role),
                airports: [],
                status: u.isActivated ? 'Active' : 'Inactive',
            })));
            setError('');
        } catch (err) {
            setError('Erreur de chargement des utilisateurs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    /* ── New / Edit user form ── */
    const [showForm, setShowForm]       = useState(false);
    const [editingId, setEditingId]     = useState(null);
    const [formName, setFormName]       = useState('');
    const [formUsername, setFormUsername] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formRole, setFormRole]       = useState('staff_ops');
    const [formAirports, setFormAirports] = useState([]);
    const [formStatus, setFormStatus]   = useState('Active');
    const [formSaving, setFormSaving]   = useState(false);

    /* ── CSV import (users) ── */
    const csvInputRef = useRef(null);
    const [csvFeedback, setCsvFeedback] = useState('');

    /* ── CSV import (leg data) ── */
    const legCsvRef = useRef(null);
    const [legCsvFeedback, setLegCsvFeedback] = useState('');
    const [legImportCount, setLegImportCount] = useState(0);

    /* ── Theme colors ── */
    const [themeColors, setThemeColors] = useState(
        Object.fromEntries([...BAR_COLOR_DEFS, ...STATE_COLOR_DEFS].map(d => [d.key, d.default]))
    );

    /* ── Form helpers ── */
    function openCreateForm() {
        setEditingId(null);
        setFormName('');
        setFormUsername('');
        setFormPassword('');
        setFormRole('staff_ops');
        setFormAirports([]);
        setFormStatus('Active');
        setShowForm(true);
    }

    function openEditForm(user) {
        setEditingId(user.id);
        setFormName(user.name);
        setFormUsername(user.username);
        setFormPassword('');
        setFormRole(user.role);
        setFormAirports(user.airports || []);
        setFormStatus(user.status);
        setShowForm(true);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        if (!formName.trim()) return;
        setFormSaving(true);

        try {
            if (editingId !== null) {
                const payload = {
                    fullName: formName,
                    matricule: formUsername,
                    role: backendRole(formRole),
                    isActivated: formStatus === 'Active',
                };
                if (formPassword.trim()) payload.password = formPassword;
                await usersApi.update(editingId, payload);
            } else {
                await usersApi.create({
                    fullName: formName,
                    matricule: formUsername || formName.toLowerCase().replace(/\s+/g, '.'),
                    password: formPassword || 'changeme',
                    role: backendRole(formRole),
                    isActivated: formStatus === 'Active',
                });
            }
            setShowForm(false);
            await fetchUsers();
        } catch (err) {
            setError(err.message);
        } finally {
            setFormSaving(false);
        }
    }

    /* ── Revoke / Activate user (toggle isActivated) ── */
    async function handleToggleActivation(user) {
        try {
            const newStatus = user.status === 'Active' ? false : true;
            await usersApi.update(user.id, { isActivated: newStatus });
            await fetchUsers();
        } catch (err) {
            setError(err.message);
        }
    }

    /* ── Delete user ── */
    async function handleDeleteUser(user) {
        try {
            await usersApi.delete(user.id);
            await fetchUsers();
        } catch (err) {
            setError(err.message);
        }
    }

    /* ── User import (CSV + xlsx) ── */
    async function handleCsvImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();

        async function processUserRows(rows) {
            if (rows.length < 2) { setCsvFeedback('Empty file.'); return; }
            const [header, ...dataRows] = rows;
            const cols = header.map(h => String(h).toLowerCase().trim());
            const idx = {
                name:      cols.indexOf('name'),
                username:  cols.indexOf('username'),
                role:      cols.indexOf('role'),
                status:    cols.indexOf('status'),
                password:  cols.indexOf('password'),
                airports:  cols.indexOf('assignedairports'),
            };
            let imported = 0;
            for (const cells of dataRows) {
                const name = idx.name >= 0 ? String(cells[idx.name] || '').trim() : '';
                if (!name) continue;
                const roleKey = APP_ROLES.find(r =>
                    r.label.toLowerCase() === (cells[idx.role] || '').toLowerCase()
                    || r.key === (cells[idx.role] || '').toLowerCase()
                )?.key || 'staff_ops';
                const rawAirports = idx.airports >= 0 ? String(cells[idx.airports] || '') : '';
                const assignedAirports = rawAirports ? rawAirports.split('|').map(a => a.trim()).filter(Boolean) : [];
                try {
                    await usersApi.create({
                        fullName: name,
                        matricule: (idx.username >= 0 ? String(cells[idx.username] || '').trim() : '') || name.toLowerCase().replace(/\s+/g, '.'),
                        password: (idx.password >= 0 ? String(cells[idx.password] || '').trim() : '') || 'changeme',
                        role: backendRole(roleKey),
                        isActivated: String(cells[idx.status] || '') !== 'Inactive',
                        assignedAirports,
                    });
                    imported++;
                } catch { /* skip duplicates */ }
            }
            await fetchUsers();
            setCsvFeedback(`${imported} user${imported !== 1 ? 's' : ''} imported`);
            setTimeout(() => setCsvFeedback(''), 3500);
        }

        if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const wb = XLSX.read(ev.target.result, { type: 'array' });
                    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
                    await processUserRows(rows);
                } catch { setCsvFeedback('Error reading Excel file.'); }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const lines = ev.target.result.split('\n').map(l => l.trim()).filter(Boolean);
                const rows = lines.map(l => l.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
                await processUserRows(rows);
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    }

    /* ── Export users to xlsx ── */
    function handleExportUsers() {
        const rows = [
            ['name', 'username', 'role', 'status', 'assignedAirports'],
            ...users.map(u => [
                u.name,
                u.username,
                APP_ROLES.find(r => r.key === u.role)?.label || u.role,
                u.status,
                (u.airports || []).join('|'),
            ]),
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Users');
        XLSX.writeFile(wb, `users_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    /* ── Helpers: normalize Excel date/time values ── */
    function normalizeDate(val) {
        if (val == null || val === '') return null;
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim();
        if (val instanceof Date) {
            const y = val.getFullYear();
            const m = String(val.getMonth() + 1).padStart(2, '0');
            const d = String(val.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const num = Number(val);
        if (!isNaN(num) && num > 40000 && num < 60000) {
            const epoch = new Date(1899, 11, 30);
            const date = new Date(epoch.getTime() + num * 86400000);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        let str = String(val).trim();
        str = str.replace(/\s+\d{1,2}:\d{2}(:\d{2})?.*$/, '').trim();
        const slashParts = str.split(/[\/\-\.]/);
        if (slashParts.length === 3) {
            let [a, b, c] = slashParts;
            if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
            if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        }
        return str || null;
    }

    function normalizeTime(val) {
        if (val == null || val === '') return null;
        if (typeof val === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(val.trim())) {
            return val.trim().slice(0, 5).padStart(5, '0');
        }
        if (val instanceof Date) {
            const h = String(val.getHours()).padStart(2, '0');
            const m = String(val.getMinutes()).padStart(2, '0');
            return `${h}:${m}`;
        }
        const num = Number(val);
        if (!isNaN(num) && num >= 0 && num < 1) {
            const totalMinutes = Math.round(num * 24 * 60);
            const h = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
            const m = String(totalMinutes % 60).padStart(2, '0');
            return `${h}:${m}`;
        }
        if (!isNaN(num) && num >= 1 && num < 24) {
            const h = Math.floor(num);
            const m = Math.round((num - h) * 60);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        return String(val).trim() || null;
    }

    /* ── Shared: convert rows (array of arrays) to Leg objects ── */
    function processRows(headerRow, dataRows) {
        const colIdx = {};
        headerRow.forEach((h, i) => { colIdx[String(h).trim().toUpperCase()] = i; });

        const requiredCols = ['LEG_NO', 'FN_CARRIER', 'FN_NUMBER', 'DEP_AP_SCHED', 'ARR_AP_SCHED', 'DEP_TIME_SCHED', 'ARR_TIME_SCHED', 'DAY_OF_ORIGIN'];
        const missing = requiredCols.filter(c => colIdx[c] === undefined);
        if (missing.length > 0) {
            setLegCsvFeedback(`Colonnes manquantes : ${missing.join(', ')}`);
            setTimeout(() => setLegCsvFeedback(''), 5000);
            return;
        }

        function getVal(row, col) {
            const idx = colIdx[col];
            if (idx === undefined) return null;
            const raw = row[idx];
            if (raw == null) return null;
            const v = String(raw).trim();
            return v === '' ? null : v;
        }

        function getDate(row, col) {
            const idx = colIdx[col];
            if (idx === undefined) return null;
            return normalizeDate(row[idx]);
        }

        function getTime(row, col) {
            const idx = colIdx[col];
            if (idx === undefined) return null;
            return normalizeTime(row[idx]);
        }

        const newLegs = [];
        let skipped = 0;
        for (const cells of dataRows) {
            const legNo = getVal(cells, 'LEG_NO');
            const carrier = getVal(cells, 'FN_CARRIER');
            const fnNum = getVal(cells, 'FN_NUMBER');
            const dayOfOrigin = getDate(cells, 'DAY_OF_ORIGIN');
            if (!legNo || !carrier || !fnNum || !dayOfOrigin) { skipped++; continue; }

            const depTime = getTime(cells, 'DEP_TIME_SCHED');
            const arrTime = getTime(cells, 'ARR_TIME_SCHED');
            if (!depTime || !arrTime) { skipped++; continue; }

            try {
                const leg = new Leg({
                    LEG_NO: legNo, UPDATE_KEY: getVal(cells, 'UPDATE_KEY'),
                    FN_CARRIER: carrier, FN_NUMBER: fnNum,
                    FN_SUFFIX: getVal(cells, 'FN_SUFFIX') || '',
                    DAY_OF_ORIGIN: dayOfOrigin,
                    AC_OWNER: getVal(cells, 'AC_OWNER') || '',
                    AC_SUBTYPE: getVal(cells, 'AC_SUBTYPE') || 'Unknown',
                    AC_VERSION: getVal(cells, 'AC_VERSION') || '',
                    AC_REGISTRATION: getVal(cells, 'AC_REGISTRATION') || 'N/A',
                    DEP_AP_SCHED: getVal(cells, 'DEP_AP_SCHED'),
                    ARR_AP_SCHED: getVal(cells, 'ARR_AP_SCHED'),
                    DEP_AP_ACTUAL: getVal(cells, 'DEP_AP_ACTUAL'),
                    ARR_AP_ACTUAL: getVal(cells, 'ARR_AP_ACTUAL'),
                    LEG_STATE: getVal(cells, 'LEG_STATE') || 'Scheduled',
                    LEG_TYPE: getVal(cells, 'LEG_TYPE') || 'PAX',
                    DEP_DAY_SCHED: getDate(cells, 'DEP_DAY_SCHED') || dayOfOrigin,
                    DEP_TIME_SCHED: depTime,
                    ARR_DAY_SCHED: getDate(cells, 'ARR_DAY_SCHED') || dayOfOrigin,
                    ARR_TIME_SCHED: arrTime,
                    DELAY_CODE_01: getVal(cells, 'DELAY_CODE_01'),
                    DELAY_TIME_01: Number(getVal(cells, 'DELAY_TIME_01')) || 0,
                    DELAY_CODE_02: getVal(cells, 'DELAY_CODE_02'),
                    DELAY_TIME_02: Number(getVal(cells, 'DELAY_TIME_02')) || 0,
                    DELAY_CODE_03: getVal(cells, 'DELAY_CODE_03'),
                    DELAY_TIME_03: Number(getVal(cells, 'DELAY_TIME_03')) || 0,
                    OFF_BLOCK_DAY: getDate(cells, 'OFF_BLOCK_DAY'),
                    OFF_BLOCK_TIME: getTime(cells, 'OFF_BLOCK_TIME'),
                    AIRBORNE_DAY: getDate(cells, 'AIRBORNE_DAY'),
                    AIRBORNE_TIME: getTime(cells, 'AIRBORNE_TIME'),
                    LANDING_DAY: getDate(cells, 'LANDING_DAY'),
                    LANDING_TIME: getTime(cells, 'LANDING_TIME'),
                    ON_BLOCK_DAY: getDate(cells, 'ON_BLOCK_DAY'),
                    ON_BLOCK_TIME: getTime(cells, 'ON_BLOCK_TIME'),
                    PRBD: getVal(cells, 'PRBD'),
                    CHANGE_TIME: getVal(cells, 'CHANGE_TIME'),
                    ENTRY_USER: getVal(cells, 'ENTRY_USER') || '',
                });
                newLegs.push(leg);
            } catch { skipped++; }
        }

        if (newLegs.length === 0) {
            setLegCsvFeedback('Aucun leg valide trouvé dans le fichier.');
            setTimeout(() => setLegCsvFeedback(''), 4000);
            return;
        }

        onLegsImported(newLegs);
        setLegImportCount(newLegs.length);
        setLegCsvFeedback(`${newLegs.length} leg${newLegs.length > 1 ? 's' : ''} importé${newLegs.length > 1 ? 's' : ''}${skipped ? ` (${skipped} ignoré${skipped > 1 ? 's' : ''})` : ''}`);
        setTimeout(() => setLegCsvFeedback(''), 5000);
    }

    /* ── Leg file import (CSV + Excel) ── */
    function handleLegFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
                    if (rows.length < 2) { setLegCsvFeedback('Fichier vide ou invalide.'); return; }
                    const [headerRow, ...dataRows] = rows;
                    processRows(headerRow, dataRows);
                } catch (err) {
                    setLegCsvFeedback('Erreur de lecture du fichier Excel.');
                    setTimeout(() => setLegCsvFeedback(''), 4000);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = ev.target.result;
                const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length < 2) { setLegCsvFeedback('Fichier vide ou invalide.'); return; }

                const headerLine = lines[0];
                const commas = (headerLine.match(/,/g) || []).length;
                const semis  = (headerLine.match(/;/g) || []).length;
                const tabs   = (headerLine.match(/\t/g) || []).length;
                const delim = semis >= commas && semis >= tabs ? ';' : tabs > commas ? '\t' : ',';

                const [hLine, ...dataLines] = lines;
                const headerRow = hLine.split(delim).map(h => h.trim().replace(/^"|"$/g, ''));

                const dataRows = dataLines.map(line => {
                    const cells = [];
                    let current = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const ch = line[i];
                        if (ch === '"') { inQuotes = !inQuotes; continue; }
                        if (ch === delim && !inQuotes) { cells.push(current.trim()); current = ''; continue; }
                        current += ch;
                    }
                    cells.push(current.trim());
                    return cells;
                });

                processRows(headerRow, dataRows);
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    }

    /* ── Theme ── */
    function handleThemeChange(key, value, cssVar) {
        setThemeColors(prev => ({ ...prev, [key]: value }));
        document.documentElement.style.setProperty(cssVar, value);
    }

    /* ── Tabs ── */
    const tabs = [
        { id: 'users',  label: 'Users' },
        { id: 'data',   label: 'Flight Data' },
        { id: 'roles',  label: 'Roles & Access' },
        { id: 'theme',  label: 'Appearance' },
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
                    <h1 className="admin-title">System Administration</h1>
                    <p className="admin-subtitle">Access management, roles and appearance — RAM OPS Center</p>
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
                                <h2>User Management</h2>
                                <p className="section-desc">{users.length} account{users.length !== 1 ? 's' : ''} · {users.filter(u => u.status === 'Active').length} active</p>
                            </div>
                            <div className="section-header-actions">
                                {csvFeedback && <span className="csv-feedback">{csvFeedback}</span>}
                                {error && <span className="csv-feedback" style={{color: '#ef4444'}}>{error}</span>}
                                <input ref={csvInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleCsvImport} />
                                <button className="btn-secondary" onClick={() => csvInputRef.current?.click()}>↑ Import</button>
                                <button className="btn-secondary" onClick={handleExportUsers} title="Export users to xlsx">↓ Export</button>
                                <button className="btn-primary" onClick={openCreateForm}>+ New user</button>
                            </div>
                        </div>

                        {/* Create/Edit form */}
                        {showForm && (
                            <form className="admin-form-card slide-down" onSubmit={handleFormSubmit}>
                                <div className="form-card-header">
                                    <h3>{editingId !== null ? 'Edit User' : 'Create User'}</h3>
                                    <button type="button" className="btn-icon-close" onClick={() => setShowForm(false)}>×</button>
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Full name</label>
                                        <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Ahmed Bertal" required />
                                    </div>
                                    <div className="form-group">
                                        <label>Matricule</label>
                                        <input type="text" value={formUsername} onChange={e => setFormUsername(e.target.value)} placeholder="e.g. ahmed.bertal" />
                                    </div>
                                    <div className="form-group">
                                        <label>Password {editingId !== null && <span style={{fontSize:11,opacity:0.6}}>(leave blank to keep unchanged)</span>}</label>
                                        <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder={editingId !== null ? '••••••••' : 'Password'} required={editingId === null} />
                                    </div>
                                    <div className="form-group">
                                        <label>Role</label>
                                        <select value={formRole} onChange={e => { setFormRole(e.target.value); if (e.target.value !== 'chef_escale') setFormAirports([]); }}>
                                            {APP_ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Airport assignment — only for chef_escale */}
                                {formRole === 'chef_escale' && (
                                    <div className="form-group" style={{ marginTop: 8 }}>
                                        <label>Assigned airports <span className="form-required">*</span></label>
                                        <p className="form-hint">Specify the airports under this Station Manager's responsibility.</p>
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
                                    <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                    <button
                                        type="submit"
                                        className="btn-submit"
                                        disabled={formSaving || (formRole === 'chef_escale' && formAirports.length === 0)}
                                    >
                                        {formSaving ? 'Saving...' : editingId !== null ? 'Save' : 'Create'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* User table */}
                        <div className="admin-table-container">
                            {loading ? (
                                <div style={{textAlign: 'center', padding: 40, opacity: 0.6}}>Chargement...</div>
                            ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Airports</th>
                                        <th>Status</th>
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
                                                        <span className="status-text">{u.status === 'Active' ? 'Active' : 'Inactive'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="action-btns">
                                                        <button className="btn-text" onClick={() => openEditForm(u)}>Edit</button>
                                                        <button
                                                            className={`btn-text ${u.status === 'Active' ? 'text-danger' : 'text-success'}`}
                                                            onClick={() => handleToggleActivation(u)}
                                                        >
                                                            {u.status === 'Active' ? 'Revoke' : 'Activate'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {users.length === 0 && !loading && (
                                        <tr><td colSpan="5" className="text-center text-muted">No users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ══ DATA TAB ══ */}
                {activeTab === 'data' && (
                    <div className="admin-section fade-in">
                        <div className="section-header">
                            <div>
                                <h2>Import des données de vols</h2>
                                <p className="section-desc">
                                    Chargez un fichier CSV (export legs) pour alimenter le Gantt, Schedule et Reports
                                </p>
                            </div>
                        </div>

                        <div className="leg-import-card">
                            <div className="leg-import-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="12" y1="18" x2="12" y2="12"/>
                                    <polyline points="9 15 12 12 15 15"/>
                                </svg>
                            </div>
                            <h3>Importer un fichier CSV ou Excel</h3>
                            <p className="leg-import-desc">
                                Formats acceptés : .csv (auto-détection du séparateur) et .xlsx / .xls (Excel).
                                Le fichier doit contenir les colonnes : LEG_NO, FN_CARRIER, FN_NUMBER, DAY_OF_ORIGIN, DEP_AP_SCHED, ARR_AP_SCHED, DEP_TIME_SCHED, ARR_TIME_SCHED, etc.
                            </p>
                            <p className="leg-import-hint">
                                Les données importées remplaceront les données actuelles dans toutes les vues.
                            </p>

                            <input ref={legCsvRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleLegFileImport} />
                            <button className="btn-primary leg-import-btn" onClick={() => legCsvRef.current?.click()}>
                                Charger un fichier (CSV / Excel)
                            </button>

                            {legCsvFeedback && (
                                <span className={`leg-csv-feedback ${legCsvFeedback.includes('manquantes') || legCsvFeedback.includes('Aucun') || legCsvFeedback.includes('invalide') ? 'error' : ''}`}>
                                    {legCsvFeedback}
                                </span>
                            )}

                            {legImportCount > 0 && !legCsvFeedback && (
                                <p className="leg-import-status">
                                    {legImportCount} leg{legImportCount > 1 ? 's' : ''} actuellement chargé{legImportCount > 1 ? 's' : ''}
                                </p>
                            )}
                        </div>

                        <div className="leg-import-columns">
                            <h4>Colonnes attendues</h4>
                            <div className="columns-grid">
                                {['LEG_NO', 'UPDATE_KEY', 'FN_CARRIER', 'FN_NUMBER', 'FN_SUFFIX', 'DAY_OF_ORIGIN',
                                  'AC_OWNER', 'AC_SUBTYPE', 'AC_VERSION', 'AC_REGISTRATION',
                                  'DEP_AP_SCHED', 'ARR_AP_SCHED', 'DEP_AP_ACTUAL', 'ARR_AP_ACTUAL',
                                  'LEG_STATE', 'LEG_TYPE', 'DEP_DAY_SCHED', 'DEP_TIME_SCHED',
                                  'ARR_DAY_SCHED', 'ARR_TIME_SCHED', 'DELAY_CODE_01', 'DELAY_TIME_01',
                                  'DELAY_CODE_02', 'DELAY_TIME_02', 'DELAY_CODE_03', 'DELAY_TIME_03',
                                  'OFF_BLOCK_DAY', 'OFF_BLOCK_TIME', 'AIRBORNE_DAY', 'AIRBORNE_TIME',
                                  'LANDING_DAY', 'LANDING_TIME', 'ON_BLOCK_DAY', 'ON_BLOCK_TIME',
                                  'PRBD', 'CHANGE_TIME', 'ENTRY_USER'
                                ].map(col => (
                                    <span key={col} className={`col-tag ${['LEG_NO','FN_CARRIER','FN_NUMBER','DAY_OF_ORIGIN','DEP_AP_SCHED','ARR_AP_SCHED','DEP_TIME_SCHED','ARR_TIME_SCHED'].includes(col) ? 'required' : ''}`}>
                                        {col}
                                    </span>
                                ))}
                            </div>
                            <p className="leg-import-hint" style={{ marginTop: 10 }}>
                                Les colonnes en rouge sont obligatoires. Les autres sont optionnelles.
                            </p>
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

                {/* ══ APPARENCE TAB ══ */}
                {activeTab === 'theme' && (
                    <div className="admin-section fade-in">
                        <div className="section-header">
                            <div>
                                <h2>Personnalisation de l'apparence</h2>
                                <p className="section-desc">Couleurs des services, états de vol et thème global</p>
                            </div>
                            <div className="section-header-actions">
                                <button className="btn-secondary" onClick={() => {
                                    const defaults = Object.fromEntries([...BAR_COLOR_DEFS, ...STATE_COLOR_DEFS].map(d => [d.key, d.default]));
                                    setThemeColors(defaults);
                                    [...BAR_COLOR_DEFS, ...STATE_COLOR_DEFS].forEach(d => {
                                        document.documentElement.style.setProperty(d.cssVar, d.default);
                                    });
                                }}>
                                    ↺ Réinitialiser les valeurs par défaut
                                </button>
                            </div>
                        </div>

                        {/* Service colors */}
                        <h3 className="apparence-section-title">Couleurs Planifié / Actuel</h3>
                        <div className="theme-grid">
                            {BAR_COLOR_DEFS.map(def => (
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

                        {/* State colors */}
                        <h3 className="apparence-section-title" style={{ marginTop: 28 }}>Couleurs des états de vol</h3>
                        <div className="theme-grid">
                            {STATE_COLOR_DEFS.map(def => (
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
