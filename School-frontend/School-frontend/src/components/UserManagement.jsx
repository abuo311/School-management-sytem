import React, { useState, useEffect } from 'react';
import API from '../services/api';
import {
    UserPlus, Trash2, Key, X, CheckCircle, Lock, ShieldAlert, ShieldCheck, Clock, Camera, User, Edit
} from 'lucide-react';

const compressProfilePhoto = (file) => new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        reject(new Error('Choose a JPEG, PNG, or WebP image.'));
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        reject(new Error('Choose an image smaller than 5 MB.'));
        return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('Unable to decode the selected image.'));
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = Math.min(1, 400 / Math.max(image.width, image.height));
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        image.src = reader.result;
    };
    reader.readAsDataURL(file);
});

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', fullName: '', role: 'TEACHER', profilePhoto: '' });
    const [loading, setLoading] = useState(false);
    const [photoProcessing, setPhotoProcessing] = useState(false);

    // Color Codes
    const goldColor = 'var(--theme-accent, #1d4ed8)';
    const blackColor = '#1a1a1a';

    // Modal states
    const [resetTarget, setResetTarget] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ fullName: '', role: 'TEACHER' });
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const res = await API.get('/users');
            setUsers(res.data);
        } catch (err) { console.error("Fetch users error", err); }
    };

    const saveProfilePhoto = async (user, profilePhoto) => {
        try {
            const response = await API.put(`/users/${user.id}`, {
                status: user.status,
                profilePhoto
            });
            setUsers(current => current.map(currentUser => currentUser.id === user.id ? response.data : currentUser));
            if (sessionStorage.getItem('userName') === user.username) {
                if (profilePhoto) sessionStorage.setItem('profilePhoto', profilePhoto);
                else sessionStorage.removeItem('profilePhoto');
                window.dispatchEvent(new Event('profile-photo-updated'));
            }
        } catch (err) {
            alert(err.response?.data || 'Failed to save user profile photo.');
        }
    };

    const handleProfilePhotoChange = async (event, user = null) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;
        setPhotoProcessing(true);
        try {
            const profilePhoto = await compressProfilePhoto(file);
            if (user) {
                await saveProfilePhoto(user, profilePhoto);
            } else {
                setNewUser(current => ({ ...current, profilePhoto }));
            }
        } catch (error) {
            alert(error.message);
        } finally {
            setPhotoProcessing(false);
            input.value = '';
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await API.post('/users', newUser);
            setNewUser({ username: '', password: '', fullName: '', role: 'TEACHER', profilePhoto: '' });
            fetchUsers();
            alert("User account enabled successfully!");
        } catch (err) {
            alert(err.response?.data || "Error creating user");
        } finally { setLoading(false); }
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setEditForm({ fullName: user.fullName || '', role: user.role || 'TEACHER' });
    };

    const handleEditSubmit = async (event) => {
        event.preventDefault();
        if (!editingUser) return;
        setSavingEdit(true);
        try {
            const response = await API.put(`/users/${editingUser.id}`, {
                fullName: editForm.fullName,
                role: editForm.role
            });
            setUsers(current => current.map(user => user.id === editingUser.id ? response.data : user));
            if (sessionStorage.getItem('userName') === editingUser.username) {
                sessionStorage.setItem('fullName', response.data.fullName);
                window.dispatchEvent(new Event('user-profile-updated'));
            }
            setEditingUser(null);
        } catch (err) {
            alert(err.response?.data || 'Failed to update user account.');
        } finally {
            setSavingEdit(false);
        }
    };

    const toggleUserStatus = async (user) => {
        // PREVENTION: Don't allow toggling Admin status
        if (user.role === 'ADMIN') return;

        const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        try {
            await API.put(`/users/${user.id}`, { ...user, status: newStatus });
            fetchUsers();
        } catch (err) {
            console.error("Status update error", err);
            alert(err.response?.data || "Failed to update user status.");
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword) return alert("Please enter a new password");
        try {
            await API.put(`/users/reset-password/${resetTarget.id}`, { password: newPassword });
            alert(`Password for ${resetTarget.username} updated.`);
            setResetTarget(null);
            setNewPassword('');
        } catch (err) {
            alert("Failed to reset password");
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm("Permanently delete this system user?")) return;
        try {
            await API.delete(`/users/${id}`);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data || "Could not delete user.");
        }
    };

    const formatLastLogin = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <style>{`
                .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                .gold-border-focus:focus { border-color: ${goldColor} !important; box-shadow: 0 0 0 0.25rem color-mix(in srgb, ${goldColor} 25%, transparent) !important; }
                .status-switch { transition: 0.3s; padding: 4px 8px; border-radius: 20px; }
                .status-active:hover { cursor: pointer; background: rgba(0,0,0,0.05); }
                .status-disabled { cursor: default; opacity: 0.8; }
            `}</style>

            {resetTarget && (
                <div className="modal-overlay">
                    <div className="card shadow-lg border-0 rounded-4 overflow-hidden" style={{ width: '380px' }}>
                        <div className="p-4 text-center text-white" style={{ backgroundColor: blackColor }}>
                            <div className="mb-2" style={{ color: goldColor }}><Lock size={32}/></div>
                            <h5 className="fw-bold mb-0">Reset Security Key</h5>
                        </div>
                        <div className="p-4">
                            <p className="small text-muted mb-3">Update password for <strong className="text-dark">{resetTarget.fullName}</strong></p>
                            <input
                                type="password"
                                className="form-control bg-light border-0 py-2 gold-border-focus mb-4"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <div className="d-flex gap-2">
                                <button className="btn btn-light w-100 fw-bold border" onClick={() => setResetTarget(null)}>Cancel</button>
                                <button className="btn w-100 fw-bold" style={{ backgroundColor: blackColor, color: goldColor }} onClick={handleResetPassword}>
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {editingUser && (
                <div className="modal-overlay">
                    <div className="card shadow-lg border-0 rounded-4 overflow-hidden" style={{ width: '420px', maxWidth: '100%' }}>
                        <div className="p-4 text-center text-white" style={{ backgroundColor: blackColor }}>
                            <div className="mb-2" style={{ color: goldColor }}><Edit size={28} /></div>
                            <h5 className="fw-bold mb-0">Edit User Account</h5>
                            <div className="small text-white-50">@{editingUser.username} · username and password are unchanged</div>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="p-4">
                                <div className="mb-3">
                                    <label className="small fw-bold text-muted">FULL NAME</label>
                                    <input
                                        type="text"
                                        className="form-control bg-light border-0 py-2 gold-border-focus"
                                        value={editForm.fullName}
                                        onChange={event => setEditForm(current => ({ ...current, fullName: event.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="mb-2">
                                    <label className="small fw-bold text-muted">SYSTEM ROLE</label>
                                    <select
                                        className="form-select bg-light border-0 py-2 gold-border-focus"
                                        value={editForm.role}
                                        onChange={event => setEditForm(current => ({ ...current, role: event.target.value }))}
                                        disabled={editingUser.username === sessionStorage.getItem('userName')}
                                    >
                                        <option value="TEACHER">Teacher / Faculty</option>
                                        <option value="BURSAR">Bursar / Accounts</option>
                                        <option value="ADMIN">System Administrator</option>
                                    </select>
                                    {editingUser.username === sessionStorage.getItem('userName') && (
                                        <div className="form-text">Your own role cannot be changed here.</div>
                                    )}
                                </div>
                            </div>
                            <div className="d-flex justify-content-end gap-2 px-4 pb-4">
                                <button type="button" className="btn btn-light border" onClick={() => setEditingUser(null)} disabled={savingEdit}>Cancel</button>
                                <button type="submit" className="btn fw-bold" style={{ backgroundColor: blackColor, color: goldColor }} disabled={savingEdit}>
                                    {savingEdit ? 'Saving...' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <header className="mb-4 text-start">
                <h3 className="fw-bold mb-1" style={{ color: blackColor }}>User Access Control</h3>
                <p className="text-muted small">Manage system permissions and account security</p>
            </header>

            <div className="row g-4">
                <div className="col-md-4 text-start">
                    <div className="card border-0 shadow-sm rounded-4 bg-white mb-4 border-top border-5" style={{ borderColor: goldColor }}>
                        <div className="card-body p-4">
                            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2" style={{ color: blackColor }}>
                                <UserPlus size={20} style={{ color: goldColor }}/> Register New User
                            </h5>
                            <form onSubmit={handleCreate}>
                                <div className="mb-3">
                                    <label className="small fw-bold text-muted d-block">PROFILE PICTURE (OPTIONAL)</label>
                                    <div className="d-flex align-items-center gap-3 mt-2">
                                        {newUser.profilePhoto ? (
                                            <img src={newUser.profilePhoto} alt="New user profile preview" className="rounded-circle border"
                                                 style={{ width: 64, height: 64, objectFit: 'cover' }} />
                                        ) : (
                                            <div className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-muted"
                                                 style={{ width: 64, height: 64 }}><User size={24} /></div>
                                        )}
                                        <label className="btn btn-sm btn-outline-dark mb-0">
                                            <Camera size={15} className="me-1" /> Choose photo
                                            <input type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden"
                                                   onChange={event => handleProfilePhotoChange(event)} />
                                        </label>
                                        {newUser.profilePhoto && (
                                            <button type="button" className="btn btn-sm btn-link text-danger" onClick={() => setNewUser(current => ({ ...current, profilePhoto: '' }))}>
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="small fw-bold text-muted">FULL NAME</label>
                                    <input type="text" className="form-control bg-light border-0 py-2 gold-border-focus" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} required />
                                </div>
                                <div className="mb-3">
                                    <label className="small fw-bold text-muted">USERNAME</label>
                                    <input type="text" className="form-control bg-light border-0 py-2 gold-border-focus" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                                </div>
                                <div className="mb-3">
                                    <label className="small fw-bold text-muted">INITIAL PASSWORD</label>
                                    <input type="password" className="form-control bg-light border-0 py-2 gold-border-focus" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                                </div>
                                <div className="mb-4">
                                    <label className="small fw-bold text-muted">SYSTEM ROLE</label>
                                    <select className="form-select bg-light border-0 py-2 gold-border-focus" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                                        <option value="TEACHER">Teacher / Faculty</option>
                                        <option value="BURSAR">Bursar / Accounts</option>
                                        <option value="ADMIN">System Administrator</option>
                                    </select>
                                </div>
                                <button className="btn w-100 fw-bold py-2 shadow-sm" style={{ backgroundColor: blackColor, color: goldColor }} disabled={loading || photoProcessing}>
                                    {loading ? 'Processing...' : <><CheckCircle size={18} className="me-2"/> Create Account</>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="col-md-8">
                    <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
                        <div className="table-responsive">
                            <table className="table align-middle mb-0">
                                <thead style={{ backgroundColor: blackColor, color: goldColor }}>
                                <tr className="small text-uppercase">
                                    <th className="ps-4 py-3 text-start border-0">Identity</th>
                                    <th className="text-start border-0">Status</th>
                                    <th className="text-start border-0">Last Access</th>
                                    <th className="text-center border-0">Security</th>
                                    <th className="text-center border-0">Action</th>
                                </tr>
                                </thead>
                                <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-bottom">
                                        <td className="ps-4 text-start">
                                            <div className="d-flex align-items-center gap-2">
                                                {u.profilePhoto ? (
                                                    <img src={u.profilePhoto} alt={`${u.fullName || u.username} profile`} className="rounded-circle border"
                                                         style={{ width: 42, height: 42, objectFit: 'cover' }} />
                                                ) : (
                                                    <div className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-muted"
                                                         style={{ width: 42, height: 42 }}><User size={18} /></div>
                                                )}
                                                <div>
                                                    <div className={`fw-bold ${u.status === 'INACTIVE' ? 'text-muted text-decoration-line-through' : 'text-dark'}`}>
                                                        {u.fullName}
                                                    </div>
                                                    <div className="small text-muted">@{u.username} | <span className="fw-bold" style={{fontSize: '10px'}}>{u.role}</span></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-start">
                                            {/* Logic: Only non-admins can be toggled */}
                                            <div
                                                className={`status-switch d-inline-flex ${u.role === 'ADMIN' ? 'status-disabled' : 'status-active'}`}
                                                onClick={() => toggleUserStatus(u)}
                                            >
                                                {u.status === 'ACTIVE' ? (
                                                    <span className="text-success d-flex align-items-center gap-1 small fw-bold">
                                                        <ShieldCheck size={16}/> Active
                                                    </span>
                                                ) : (
                                                    <span className="text-danger d-flex align-items-center gap-1 small fw-bold">
                                                        <ShieldAlert size={16}/> Locked
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-start small text-muted">
                                            <div className="d-flex align-items-center gap-1">
                                                <Clock size={12}/> {formatLastLogin(u.lastLogin)}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <button
                                                className="btn btn-sm px-3 rounded-pill border fw-bold"
                                                style={{ fontSize: '11px' }}
                                                onClick={() => setResetTarget(u)}
                                            >
                                                <Key size={14} className="me-1" style={{ color: goldColor }}/> Reset
                                            </button>
                                        </td>
                                        <td className="text-center">
                                            <button type="button" className="btn btn-sm btn-outline-primary me-2" title="Edit full name and role" onClick={() => openEdit(u)}>
                                                <Edit size={15} />
                                            </button>
                                            <label className="btn btn-sm btn-outline-dark me-2 mb-0" title="Upload or change profile picture">
                                                <Camera size={15} />
                                                <input type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden"
                                                       disabled={photoProcessing}
                                                       onChange={event => handleProfilePhotoChange(event, u)} />
                                            </label>
                                            {u.role !== 'ADMIN' ? (
                                                <button className="btn text-danger opacity-75 hover-opacity-100" onClick={() => deleteUser(u.id)}>
                                                    <Trash2 size={18}/>
                                                </button>
                                            ) : (
                                                <span className="text-muted small">Protected</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;