import React, { useState } from 'react';
import './AdminPage.css';

const MOCK_ROLES = ["Super Admin", "Operations Manager", "Dispatcher", "Read Only"];
const MOCK_GROUPS = ["Global Fleet", "Domestic", "Cargo Ops", "Maintenance"];

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('users');

    // Mock State for Users
    const [users, setUsers] = useState([
        { id: 1, name: "Ali Idrissi", role: "Super Admin", group: "Global Fleet", status: "Active" },
        { id: 2, name: "Sara Bouzidi", role: "Dispatcher", group: "Domestic", status: "Active" },
        { id: 3, name: "Mehdi Alami", role: "Read Only", group: "Cargo Ops", status: "Inactive" },
    ]);

    // Form states for new user
    const [showNewUserForm, setShowNewUserForm] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState(MOCK_ROLES[0]);
    const [newUserGroup, setNewUserGroup] = useState(MOCK_GROUPS[0]);

    // Handle adding a user
    const handleAddUser = (e) => {
        e.preventDefault();
        if (!newUserName.trim()) return;

        const newUser = {
            id: Date.now(),
            name: newUserName,
            role: newUserRole,
            group: newUserGroup,
            status: "Active"
        };

        setUsers([...users, newUser]);
        setNewUserName('');
        setShowNewUserForm(false);
    };

    // Theme customizer state
    const [themeColors, setThemeColors] = useState({
        ramRed: "#c8102e",
        ramGold: "#f59e0b",
        bgSurface2: "#111e32",
        paxBar: "#c8102e",
        cargoBar: "#0284c7"
    });

    const handleThemeChange = (key, value, cssVar) => {
        setThemeColors(prev => ({ ...prev, [key]: value }));
        document.documentElement.style.setProperty(cssVar, value);
    };

    const tabs = [
        { id: 'users', label: 'Users' },
        { id: 'roles', label: 'Roles & Permissions' },
        { id: 'groups', label: 'Groups' },
        { id: 'theme', label: 'Theme Customizer' },
    ];

    return (
        <div className="admin-page">
            <header className="admin-header">
                <h1 className="admin-title">System Administration</h1>
            </header>

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
                {activeTab === 'users' && (
                    <div className="admin-section fade-in">
                        <div className="section-header">
                            <h2>User Management</h2>
                            <button className="btn-primary" onClick={() => setShowNewUserForm(!showNewUserForm)}>
                                {showNewUserForm ? "Cancel" : "+ Add User"}
                            </button>
                        </div>

                        {showNewUserForm && (
                            <form className="admin-form-card slide-down" onSubmit={handleAddUser}>
                                <h3>Create New User</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            value={newUserName}
                                            onChange={e => setNewUserName(e.target.value)}
                                            placeholder="e.g. Youssef T."
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Role</label>
                                        <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                                            {MOCK_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Assigned Group</label>
                                        <select value={newUserGroup} onChange={e => setNewUserGroup(e.target.value)}>
                                            {MOCK_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn-submit">Create User</button>
                                </div>
                            </form>
                        )}

                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Group</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td className="fw-600">{u.name}</td>
                                            <td><span className="badge role-badge">{u.role}</span></td>
                                            <td><span className="badge group-badge">{u.group}</span></td>
                                            <td>
                                                <span className={`status-dot ${u.status === 'Active' ? 'active' : 'inactive'}`}></span>
                                                {u.status}
                                            </td>
                                            <td>
                                                <button className="btn-text">Edit</button>
                                                <button
                                                    className="btn-text text-danger"
                                                    onClick={() => setUsers(users.filter(usr => usr.id !== u.id))}
                                                >
                                                    Revoke
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr><td colSpan="5" className="text-center">No users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="admin-section fade-in">
                        <h2>Roles & Permissions</h2>
                        <p className="text-muted">Currently viewing predefined system roles.</p>
                        <div className="roles-grid">
                            {MOCK_ROLES.map(role => (
                                <div key={role} className="role-card">
                                    <div className="role-card-header">
                                        <h3>{role}</h3>
                                        <button className="btn-icon">⚙️</button>
                                    </div>
                                    <ul className="role-perms">
                                        <li>✔️ Edit Flights</li>
                                        <li>{role === 'Read Only' ? '❌' : '✔️'} Run Reports</li>
                                        <li>{role === 'Super Admin' ? '✔️' : '❌'} Manage Users</li>
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'groups' && (
                    <div className="admin-section fade-in">
                        <h2>Group Management</h2>
                        <div className="groups-list">
                            {MOCK_GROUPS.map(group => (
                                <div key={group} className="group-item">
                                    <span className="group-name"> {group}</span>
                                    <span className="group-count">{Math.floor(Math.random() * 20) + 2} Users</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'theme' && (
                    <div className="admin-section fade-in">
                        <h2>Theme Customizer</h2>
                        <p className="text-muted">Live-edit the application's global CSS variables.</p>

                        <div className="theme-grid">
                            <div className="theme-card">
                                <h3>Primary Accent (RAM Red)</h3>
                                <div className="color-picker-wrapper">
                                    <input
                                        type="color"
                                        value={themeColors.ramRed}
                                        onChange={(e) => handleThemeChange('ramRed', e.target.value, '--ram-red')}
                                    />
                                    <code>{themeColors.ramRed}</code>
                                </div>
                            </div>

                            <div className="theme-card">
                                <h3>Card Backgrounds</h3>
                                <div className="color-picker-wrapper">
                                    <input
                                        type="color"
                                        value={themeColors.bgSurface2}
                                        onChange={(e) => handleThemeChange('bgSurface2', e.target.value, '--bg-surface-2')}
                                    />
                                    <code>{themeColors.bgSurface2}</code>
                                </div>
                            </div>

                            <div className="theme-card">
                                <h3>Gantt PAX Bar Color</h3>
                                <div className="color-picker-wrapper">
                                    <input
                                        type="color"
                                        value={themeColors.paxBar}
                                        onChange={(e) => handleThemeChange('paxBar', e.target.value, '--svc-pax-bar')}
                                    />
                                    <code>{themeColors.paxBar}</code>
                                </div>
                            </div>

                            <div className="theme-card">
                                <h3>Gantt Cargo Bar Color</h3>
                                <div className="color-picker-wrapper">
                                    <input
                                        type="color"
                                        value={themeColors.cargoBar}
                                        onChange={(e) => handleThemeChange('cargoBar', e.target.value, '--svc-cargo-bar')}
                                    />
                                    <code>{themeColors.cargoBar}</code>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
