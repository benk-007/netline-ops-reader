import { useState, useEffect, useCallback } from "react";
import { DEFAULT_PROFILE } from "../../constants/ganttConstants";
import "./ProfileManager.css";
import { SERVICE_COLORS, SUBTYPE_OPTIONS } from "../../constants/ganttConstants";
import { legs, dates } from "../../data/flightsData";
import SearchableSelect from "../Filters/SearchableSelect";
import { filtersApi } from "../../api";

const STORAGE_KEY = "ram_gantt_profiles";
const allDeps     = ["Tous", ...[...new Set(legs.map(l => l.dep))].sort()];
const allArrs     = ["Tous", ...[...new Set(legs.map(l => l.arr))].sort()];
const allServices = ["Tous", ...Object.keys(SERVICE_COLORS)];
const allDates    = ["Tous", ...dates];
const allSubtypes = ["Tous", ...SUBTYPE_OPTIONS.filter(t => t !== "Tous types")];

/* ── Local fallback if backend is unavailable ── */
function loadLocalProfiles() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) { }
    return [{ ...DEFAULT_PROFILE }];
}

function saveLocalProfiles(profiles) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function generateId() {
    return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function ProfileManager({ isOpen, onClose, currentFilters, utcMode, zoom, onLoadProfile, userId }) {
    const [profiles, setProfiles] = useState(loadLocalProfiles);
    const [newName, setNewName] = useState("");
    const [activeTab, setActiveTab] = useState("load");
    const [saved, setSaved] = useState(false);
    const [profileFilters, setProfileFilters] = useState({ ...currentFilters });

    /* ── Load profiles from backend when user is logged in ── */
    const fetchProfiles = useCallback(async () => {
        if (!userId) return;
        try {
            const data = await filtersApi.getByUser(userId);
            const backendProfiles = data.map(f => ({
                id: f.id,
                backendId: f.id,
                name: f.name,
                filters: {
                    fDep: f.depAirport || [],
                    fArr: f.arrAirport || [],
                    fService: f.serviceType || [],
                    fSubtype: f.aircraftType || [],
                    fFlight: (f.flightNumber && f.flightNumber[0]) || "",
                    fDate: [],
                },
                savedAt: new Date().toISOString(),
            }));
            const localProfiles = loadLocalProfiles().filter(p => !p.backendId);
            const merged = [...localProfiles, ...backendProfiles];
            setProfiles(merged.length > 0 ? merged : [{ ...DEFAULT_PROFILE }]);
        } catch {
            setProfiles(loadLocalProfiles());
        }
    }, [userId]);

    useEffect(() => {
        if (isOpen) {
            fetchProfiles();
            setNewName("");
            setSaved(false);
            setProfileFilters({ ...currentFilters });
        }
    }, [isOpen, currentFilters, fetchProfiles]);

    if (!isOpen) return null;

    async function handleSave() {
        if (!newName.trim()) return;

        const profile = {
            id: generateId(),
            name: newName.trim(),
            filters: { ...profileFilters },
            utcMode,
            zoom,
            savedAt: new Date().toISOString(),
        };

        // Save to backend if userId is available
        if (userId) {
            try {
                const created = await filtersApi.create({
                    name: newName.trim(),
                    userId,
                    depAirport: profileFilters.fDep || [],
                    arrAirport: profileFilters.fArr || [],
                    serviceType: profileFilters.fService || [],
                    aircraftType: profileFilters.fSubtype || [],
                    flightNumber: profileFilters.fFlight ? [profileFilters.fFlight] : [],
                });
                profile.backendId = created.id;
                profile.id = created.id;
            } catch {
                // Fall back to local storage
            }
        }

        const updated = [...profiles, profile];
        setProfiles(updated);
        saveLocalProfiles(updated);
        setNewName("");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    async function handleDelete(id) {
        if (id === "default") return;
        const profile = profiles.find(p => p.id === id);
        if (profile?.backendId) {
            try {
                await filtersApi.delete(profile.backendId);
            } catch { /* ignore */ }
        }
        const updated = profiles.filter(p => p.id !== id);
        setProfiles(updated);
        saveLocalProfiles(updated);
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
                                                    .flatMap(([k, v]) => {
                                                        if (Array.isArray(v)) return v.map(item => ({ k, label: item }));
                                                        if (!v || v === "Tous" || v === "Tous types" || v === "") return [];
                                                        return [{ k, label: v }];
                                                    })
                                                    .slice(0, 4)
                                                    .map(({ k, label }, i) => (
                                                        <span key={`${k}-${i}`} className="pm-tag">{label}</span>
                                                    ))}
                                                {Object.entries(profile.filters).every(([, v]) =>
                                                    Array.isArray(v) ? v.length === 0 : (!v || v === "Tous" || v === "Tous types" || v === "")
                                                ) && (
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

                                <div className="pm-editor-row pm-editor-row-select">
                                    <label>Date</label>
                                    <SearchableSelect
                                        options={allDates}
                                        value={Array.isArray(profileFilters.fDate) ? profileFilters.fDate : []}
                                        onChange={v => setProfileFilters({ ...profileFilters, fDate: v })}
                                        placeholder="Rechercher date..."
                                        multi
                                    />
                                </div>

                                <div className="pm-editor-row pm-editor-row-select">
                                    <label>DEP</label>
                                    <SearchableSelect
                                        options={allDeps}
                                        value={Array.isArray(profileFilters.fDep) ? profileFilters.fDep : []}
                                        onChange={v => setProfileFilters({ ...profileFilters, fDep: v })}
                                        placeholder="Rechercher aéroport..."
                                        multi
                                    />
                                </div>

                                <div className="pm-editor-row pm-editor-row-select">
                                    <label>ARR</label>
                                    <SearchableSelect
                                        options={allArrs}
                                        value={Array.isArray(profileFilters.fArr) ? profileFilters.fArr : []}
                                        onChange={v => setProfileFilters({ ...profileFilters, fArr: v })}
                                        placeholder="Rechercher aéroport..."
                                        multi
                                    />
                                </div>

                                <div className="pm-editor-row pm-editor-row-select">
                                    <label>Service</label>
                                    <SearchableSelect
                                        options={allServices}
                                        value={Array.isArray(profileFilters.fService) ? profileFilters.fService : []}
                                        onChange={v => setProfileFilters({ ...profileFilters, fService: v })}
                                        placeholder="Rechercher service..."
                                        multi
                                    />
                                </div>

                                <div className="pm-editor-row pm-editor-row-select">
                                    <label>Type Avion</label>
                                    <SearchableSelect
                                        options={allSubtypes}
                                        value={Array.isArray(profileFilters.fSubtype) ? profileFilters.fSubtype : []}
                                        onChange={v => setProfileFilters({ ...profileFilters, fSubtype: v })}
                                        placeholder="Rechercher type..."
                                        multi
                                    />
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
