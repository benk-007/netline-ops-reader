import { useState, useEffect } from "react";
import { DEFAULT_PROFILE } from "../../constants/ganttConstants";
import "./ProfileManager.css";
import { SERVICE_COLORS, SUBTYPE_OPTIONS } from "../../constants/ganttConstants";
import { legs, dates } from "../../data/flightsData";
const STORAGE_KEY = "ram_gantt_profiles";
const allDeps = ["Tous", ...[...new Set(legs.map(l => l.dep))].sort()];
const allArrs = ["Tous", ...[...new Set(legs.map(l => l.arr))].sort()];
const allServices = ["Tous", ...Object.keys(SERVICE_COLORS)];
const allDates = ["Toutes dates", ...dates];
const allSubtypes = SUBTYPE_OPTIONS;
function loadProfiles() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) { }
    return [{ ...DEFAULT_PROFILE }];
}

function saveProfiles(profiles) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function generateId() {
    return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function ProfileManager({ isOpen, onClose, currentFilters, utcMode, zoom, onLoadProfile }) {
    const [profiles, setProfiles] = useState(loadProfiles);
    const [newName, setNewName] = useState("");
    const [activeTab, setActiveTab] = useState("load"); // "load" | "save"
    const [saved, setSaved] = useState(false);
    const [profileFilters, setProfileFilters] = useState({ ...currentFilters });

    useEffect(() => {
        if (isOpen) {
            setProfiles(loadProfiles());
            setNewName("");
            setSaved(false);
            setProfileFilters({ ...currentFilters });
        }
    }, [isOpen, currentFilters]);

    if (!isOpen) return null;

    function handleSave() {
        if (!newName.trim()) return;
        const profile = {
            id: generateId(),
            name: newName.trim(),
            filters: { ...profileFilters },
            utcMode,
            zoom,
            savedAt: new Date().toISOString(),
        };
        const updated = [...profiles, profile];
        setProfiles(updated);
        saveProfiles(updated);
        setNewName("");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    function handleDelete(id) {
        if (id === "default") return; // can't delete default
        const updated = profiles.filter(p => p.id !== id);
        setProfiles(updated);
        saveProfiles(updated);
    }

    function handleLoad(profile) {
        onLoadProfile(profile);
        onClose();
    }

    return (
        <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="pm-modal" role="dialog" aria-label="Profile Manager" aria-modal="true">

                {/* Header */}
                <div className="pm-header">
                    <div className="pm-header-left">
                        <div className="pm-header-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                            </svg>

                        </div>
                        <div>
                            <div className="pm-title">Profils de vue</div>
                            <div className="pm-subtitle">Sauvegardez et rechargez vos configurations de filtres</div>
                        </div>
                    </div>
                    <button className="pm-close" onClick={onClose} aria-label="Fermer">×</button>
                </div>

                {/* Tabs */}
                <div className="pm-tabs">
                    <button className={`pm-tab ${activeTab === "load" ? "active" : ""}`} onClick={() => setActiveTab("load")}>
                        Charger un profil
                    </button>
                    <button className={`pm-tab ${activeTab === "save" ? "active" : ""}`} onClick={() => setActiveTab("save")}>
                        Sauvegarder
                    </button>
                </div>

                {/* Tab: Load */}
                {activeTab === "load" && (
                    <div className="pm-body">
                        {profiles.length === 0 ? (
                            <div className="pm-empty">Aucun profil sauvegardé. Créez votre premier profil.</div>
                        ) : (
                            <div className="pm-list">
                                {profiles.map(profile => (
                                    <div key={profile.id} className="pm-profile-card">
                                        <div className="pm-profile-info">
                                            <div className="pm-profile-name">{profile.name}</div>
                                            <div className="pm-profile-meta">
                                                {profile.savedAt
                                                    ? new Date(profile.savedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
                                                    : "Profil par défaut"}
                                            </div>
                                            <div className="pm-profile-tags">
                                                {Object.entries(profile.filters)
                                                    .filter(([, v]) => v && v !== "Tous" && v !== "Tous types" && v !== "")
                                                    .slice(0, 4)
                                                    .map(([k, v]) => (
                                                        <span key={k} className="pm-tag">{v}</span>
                                                    ))}
                                                {Object.values(profile.filters).every(v => !v || v === "Tous" || v === "Tous types" || v === "") && (
                                                    <span className="pm-tag pm-tag-neutral">Tous filtres</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="pm-profile-actions">
                                            <button className="pm-load-btn" onClick={() => handleLoad(profile)}>
                                                Charger
                                            </button>
                                            {profile.id !== "default" && (
                                                <button className="pm-delete-btn" onClick={() => handleDelete(profile.id)} aria-label="Supprimer">
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Save */}
                {activeTab === "save" && (
                    <div className="pm-body">
                        <div className="pm-save-section">
                            <div className="pm-section-label">Nom du profil</div>
                            <div className="pm-save-input-row">
                                <input
                                    className="pm-name-input"
                                    type="text"
                                    placeholder="ex: Vue CDG matin..."
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleSave()}
                                    maxLength={40}
                                />
                                <button className="pm-save-btn" onClick={handleSave} disabled={!newName.trim()}>
                                    {saved ? (
                                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Sauvegardé</>
                                    ) : "Sauvegarder"}
                                </button>
                            </div>

                            {/* Manual filter selection */}
                            <div className="pm-section-label" style={{ marginTop: 20 }}>Détails du profil</div>
                            <div className="pm-filter-editor">

                                <div className="pm-editor-row">
                                    <label>Date</label>
                                    <select
                                        value={profileFilters.fDate}
                                        onChange={e => setProfileFilters({ ...profileFilters, fDate: e.target.value })}
                                    >
                                        {allDates.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pm-editor-row">
                                    <label>DEP</label>
                                    <select
                                        value={profileFilters.fDep}
                                        onChange={e => setProfileFilters({ ...profileFilters, fDep: e.target.value })}
                                    >
                                        {allDeps.map(dep => (
                                            <option key={dep} value={dep}>{dep}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pm-editor-row">
                                    <label>ARR</label>
                                    <select
                                        value={profileFilters.fArr}
                                        onChange={e => setProfileFilters({ ...profileFilters, fArr: e.target.value })}
                                    >
                                        {allArrs.map(arr => (
                                            <option key={arr} value={arr}>{arr}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pm-editor-row">
                                    <label>Service</label>
                                    <select
                                        value={profileFilters.fService}
                                        onChange={e => setProfileFilters({ ...profileFilters, fService: e.target.value })}
                                    >
                                        {allServices.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pm-editor-row">
                                    <label>Type Avion</label>
                                    <select
                                        value={profileFilters.fSubtype}
                                        onChange={e => setProfileFilters({ ...profileFilters, fSubtype: e.target.value })}
                                    >
                                        {allSubtypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pm-editor-row">
                                    <label>Vol N°</label>
                                    <input
                                        type="text"
                                        value={profileFilters.fFlight}
                                        placeholder="AT101..."
                                        onChange={e => setProfileFilters({ ...profileFilters, fFlight: e.target.value })}
                                    />
                                </div>

                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
