import React, { useState, useEffect, useCallback } from 'react';
import * as bootstrap from 'bootstrap';
import API from '../services/api';
import { UserPlus, Trash2, Search, Edit, User, Link, Camera } from 'lucide-react';

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

const TeacherList = () => {
    const [teachers, setTeachers] = useState([]);
    const [nonTeachingStaff, setNonTeachingStaff] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [nonTeachingForm, setNonTeachingForm] = useState({ fullName: '', position: '', profilePhoto: '' });
    const [editingNonTeachingId, setEditingNonTeachingId] = useState(null);
    const [nonTeachingLoading, setNonTeachingLoading] = useState(false);
    const [photoProcessing, setPhotoProcessing] = useState(false);

    const goldColor = 'var(--theme-accent, #1d4ed8)';
    const blackColor = '#1a1a1a';

    const [formData, setFormData] = useState({
        id: null,
        firstName: '',
        lastName: '',
        email: '',
        specialization: '',
        profilePhoto: '',
        user: { id: '' }
    });

    const handlePhotoChange = async (event, updateForm) => {
        const input = event.target;
        const file = input.files?.[0];
        if (!file) return;
        setPhotoProcessing(true);
        try {
            const profilePhoto = await compressProfilePhoto(file);
            updateForm(current => ({ ...current, profilePhoto }));
        } catch (error) {
            alert(error.message);
        } finally {
            setPhotoProcessing(false);
            input.value = '';
        }
    };

    // 1. IMPROVED FETCH: Wrapped in useCallback to prevent infinite loops if used in effects
    const fetchTeachers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get('/teachers');
            // Backend might send an object with a 'content' field if using Pagination
            const data = Array.isArray(res.data) ? res.data : (res.data?.content || []);
            setTeachers(data);
        } catch (err) {
            console.error("Teacher Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await API.get('/users/unassigned');
            const data = Array.isArray(res.data) ? res.data : [];
            setAvailableUsers(data);
        } catch (err) {
            console.error("User Fetch Error:", err);
        }
    }, []);

    const fetchNonTeachingStaff = useCallback(async () => {
        setNonTeachingLoading(true);
        try {
            const res = await API.get('/non-teaching-staff');
            setNonTeachingStaff(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Non-teaching staff fetch error:", err);
        } finally {
            setNonTeachingLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeachers();
        fetchUsers();
        fetchNonTeachingStaff();
        return () => {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(b => b.remove());
        };
    }, [fetchTeachers, fetchUsers, fetchNonTeachingStaff]);

    const handleNonTeachingSubmit = async (event) => {
        event.preventDefault();
        try {
            if (editingNonTeachingId) {
                const existingStaff = nonTeachingStaff.find(staff => staff.id === editingNonTeachingId);
                await API.put(`/non-teaching-staff/${editingNonTeachingId}`, {
                    ...nonTeachingForm,
                    active: existingStaff?.active ?? true
                });
            } else {
                await API.post('/non-teaching-staff', nonTeachingForm);
            }
            setNonTeachingForm({ fullName: '', position: '', profilePhoto: '' });
            setEditingNonTeachingId(null);
            await fetchNonTeachingStaff();
        } catch (err) {
            alert(err.response?.data?.message || err.response?.data || 'Failed to save non-teaching staff.');
        }
    };

    const editNonTeachingStaff = (staff) => {
        setNonTeachingForm({ fullName: staff.fullName, position: staff.position, profilePhoto: staff.profilePhoto || '' });
        setEditingNonTeachingId(staff.id);
    };

    const toggleNonTeachingStaff = async (staff) => {
        try {
            await API.put(`/non-teaching-staff/${staff.id}`, {
                fullName: staff.fullName,
                position: staff.position,
                active: !staff.active
            });
            await fetchNonTeachingStaff();
        } catch (err) {
            alert(err.response?.data?.message || err.response?.data || 'Failed to update staff status.');
        }
    };

    const handleOpenModal = (teacher = null) => {
        if (teacher) {
            setIsEditing(true);
            setFormData({
                id: teacher.id || null,
                firstName: teacher.firstName || '',
                lastName: teacher.lastName || '',
                email: teacher.email || '',
                specialization: teacher.specialization || '',
                profilePhoto: teacher.profilePhoto || '',
                user: { id: teacher.user?.id || '' }
            });

            // Ensure the currently linked user is in the dropdown options
            if (teacher.user && !availableUsers.find(u => u.id === teacher.user.id)) {
                setAvailableUsers(prev => [teacher.user, ...prev]);
            }
        } else {
            setIsEditing(false);
            setFormData({ id: null, firstName: '', lastName: '', email: '', specialization: '', profilePhoto: '', user: { id: '' } });
            fetchUsers();
        }
        const modalElement = document.getElementById('teacherModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.user.id) {
            alert("Please link this teacher to a user account.");
            return;
        }

        try {
            if (isEditing) {
                await API.put(`/teachers/${formData.id}`, formData);
            } else {
                await API.post('/teachers', formData);
            }
            
            // Proper Modal Dismissal
            const modalElement = document.getElementById('teacherModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();

            await fetchTeachers();
            await fetchUsers();
        } catch (err) {
            console.error("Submit error:", err);
            const msg = err.response?.data?.message || err.response?.data || "Failed to save record.";
            alert(msg);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Permanently delete this staff record?")) {
            try {
                await API.delete(`/teachers/${id}`);
                fetchTeachers();
                fetchUsers();
            } catch (err) {
                console.error("Delete error:", err);
            }
        }
    };

    const filteredTeachers = teachers.filter(t =>
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.specialization && t.specialization.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="container-fluid py-4 text-start bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="fw-bold mb-0" style={{ color: blackColor }}>Staff & Teachers</h3>
                    <p className="text-muted small">Manage teaching and non-teaching staff, profile photos, and system links</p>
                </div>
                <div className="d-flex gap-2">
                    <div className="input-group d-none d-md-flex" style={{ maxWidth: '250px' }}>
                        <span className="input-group-text bg-white border-end-0"><Search size={18} style={{ color: goldColor }}/></span>
                        <input type="text" className="form-control border-start-0 ps-0 shadow-none bg-white" placeholder="Search..." onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn d-flex align-items-center gap-2 fw-bold"
                            style={{ backgroundColor: blackColor, color: goldColor }}
                            onClick={() => handleOpenModal()}>
                        <UserPlus size={18} /> Add Teacher
                    </button>
                </div>
            </div>

            <section className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                <div className="mb-3">
                    <h5 className="fw-bold mb-1">Non-Teaching Staff</h5>
                    <p className="text-muted small mb-0">Manage caterers, security staff, cleaners, and other school staff without requiring login accounts.</p>
                </div>
                <form className="row g-2 mb-3" onSubmit={handleNonTeachingSubmit}>
                    <div className="col-12 d-flex align-items-center gap-3">
                        {nonTeachingForm.profilePhoto ? (
                            <img src={nonTeachingForm.profilePhoto} alt="Non-teaching staff preview" className="rounded-circle border"
                                 style={{ width: 64, height: 64, objectFit: 'cover' }} />
                        ) : <div className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-muted" style={{ width: 64, height: 64 }}><User size={24} /></div>}
                        <label className="btn btn-sm btn-outline-dark mb-0">
                            <Camera size={15} className="me-1" /> {nonTeachingForm.profilePhoto ? 'Change photo' : 'Add profile photo'}
                            <input type="file" accept="image/*" className="visually-hidden"
                                   onChange={event => handlePhotoChange(event, setNonTeachingForm)} />
                        </label>
                    </div>
                    <div className="col-md-5">
                        <label className="form-label small fw-bold" htmlFor="nonTeachingName">Full name</label>
                        <input
                            id="nonTeachingName"
                            className="form-control"
                            value={nonTeachingForm.fullName}
                            onChange={event => setNonTeachingForm({ ...nonTeachingForm, fullName: event.target.value })}
                            required
                        />
                    </div>
                    <div className="col-md-5">
                        <label className="form-label small fw-bold" htmlFor="nonTeachingPosition">Position</label>
                        <input
                            id="nonTeachingPosition"
                            className="form-control"
                            placeholder="e.g. Caterer or Security"
                            value={nonTeachingForm.position}
                            onChange={event => setNonTeachingForm({ ...nonTeachingForm, position: event.target.value })}
                            required
                        />
                    </div>
                    <div className="col-md-2 d-flex align-items-end gap-2">
                        <button type="submit" className="btn btn-dark text-warning w-100" disabled={photoProcessing}>
                            {editingNonTeachingId ? 'Save changes' : 'Add staff'}
                        </button>
                        {editingNonTeachingId && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                    setNonTeachingForm({ fullName: '', position: '', profilePhoto: '' });
                                    setEditingNonTeachingId(null);
                                }}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr><th>Name</th><th>Position</th><th>Status</th><th className="text-end">Actions</th></tr>
                        </thead>
                        <tbody>
                            {nonTeachingLoading ? (
                                <tr><td colSpan="4" className="text-center py-4">Loading staff...</td></tr>
                            ) : nonTeachingStaff.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-4 text-muted">No non-teaching staff have been added.</td></tr>
                            ) : nonTeachingStaff.map(staff => (
                                <tr key={staff.id}>
                                    <td className="fw-semibold">
                                        <span className="d-inline-flex align-items-center gap-2">
                                            {staff.profilePhoto ? <img src={staff.profilePhoto} alt="" className="rounded-circle" style={{ width: 38, height: 38, objectFit: 'cover' }} /> : <span className="rounded-circle bg-light border d-flex align-items-center justify-content-center" style={{ width: 38, height: 38 }}><User size={17} /></span>}
                                            {staff.fullName}
                                        </span>
                                    </td>
                                    <td>{staff.position}</td>
                                    <td><span className={`badge ${staff.active ? 'bg-success' : 'bg-secondary'}`}>{staff.active ? 'Active' : 'Inactive'}</span></td>
                                    <td className="text-end">
                                        <button type="button" className="btn btn-sm btn-outline-dark me-2" onClick={() => editNonTeachingStaff(staff)}>Edit</button>
                                        <button type="button" className={`btn btn-sm ${staff.active ? 'btn-outline-danger' : 'btn-outline-success'}`} onClick={() => toggleNonTeachingStaff(staff)}>
                                            {staff.active ? 'Deactivate' : 'Reactivate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Table */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead style={{ backgroundColor: blackColor, color: goldColor }}>
                        <tr>
                            <th className="px-4 py-3 border-0 text-uppercase small fw-bold">Name</th>
                            <th className="border-0 text-uppercase small fw-bold">Specialization</th>
                            <th className="border-0 text-uppercase small fw-bold">Linked User</th>
                            <th className="text-center border-0 text-uppercase small fw-bold">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="text-center py-5"><div className="spinner-border spinner-border-sm text-warning me-2"></div> Loading...</td></tr>
                        ) : filteredTeachers.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-5 text-muted">No faculty records found.</td></tr>
                        ) : (
                            filteredTeachers.map(t => (
                                <tr key={t.id}>
                                    <td className="px-4 fw-bold text-dark">
                                        <span className="d-inline-flex align-items-center gap-2">
                                            {t.profilePhoto ? <img src={t.profilePhoto} alt="" className="rounded-circle" style={{ width: 38, height: 38, objectFit: 'cover' }} /> : <span className="rounded-circle bg-light border d-flex align-items-center justify-content-center" style={{ width: 38, height: 38 }}><User size={17} /></span>}
                                            {t.firstName} {t.lastName}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge rounded-pill px-3 py-2"
                                              style={{ backgroundColor: 'var(--theme-accent-soft)', color: blackColor, border: '1px solid var(--theme-accent)' }}>
                                            {t.specialization}
                                        </span>
                                    </td>
                                    <td className="text-muted small">
                                        {t.user ? (
                                            <span className="badge bg-white text-dark border d-inline-flex align-items-center gap-1 shadow-sm">
                                                <User size={12} style={{ color: goldColor }}/> {t.user.username}
                                            </span>
                                        ) : (
                                            <span className="text-danger x-small fw-bold">UNLINKED</span>
                                        )}
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex justify-content-center gap-1">
                                            <button onClick={() => handleOpenModal(t)} className="btn btn-sm border-0"><Edit size={16} style={{ color: blackColor }}/></button>
                                            <button onClick={() => handleDelete(t.id)} className="btn btn-sm border-0"><Trash2 size={16} className="text-danger"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Teacher Modal */}
            <div className="modal fade" id="teacherModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <form className="modal-content border-0 shadow-lg" onSubmit={handleSubmit}>
                        <div className="modal-header text-white border-bottom border-gold border-3" style={{ backgroundColor: blackColor }}>
                            <h5 className="modal-title fw-bold" style={{ color: goldColor }}>
                                {isEditing ? 'Update Faculty Profile' : 'Register New Faculty'}
                            </h5>
                            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div className="modal-body p-4 bg-white">
                            <div className="row g-3">
                                <div className="col-12 d-flex align-items-center gap-3">
                                    {formData.profilePhoto ? (
                                        <img src={formData.profilePhoto} alt="Teaching staff preview" className="rounded-circle border"
                                             style={{ width: 64, height: 64, objectFit: 'cover' }} />
                                    ) : <div className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-muted" style={{ width: 64, height: 64 }}><User size={24} /></div>}
                                    <label className="btn btn-sm btn-outline-dark mb-0">
                                        <Camera size={15} className="me-1" /> {formData.profilePhoto ? 'Change photo' : 'Add profile photo'}
                                        <input type="file" accept="image/*" className="visually-hidden"
                                               onChange={event => handlePhotoChange(event, setFormData)} />
                                    </label>
                                </div>
                                <div className="col-md-6">
                                    <label className="small fw-bold mb-1">First Name</label>
                                    <input type="text" className="form-control bg-light border-0 shadow-none" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                                </div>
                                <div className="col-md-6">
                                    <label className="small fw-bold mb-1">Last Name</label>
                                    <input type="text" className="form-control bg-light border-0 shadow-none" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
                                </div>
                                <div className="col-12">
                                    <label className="small fw-bold mb-1">Email</label>
                                    <input type="email" className="form-control bg-light border-0 shadow-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                                </div>
                                <div className="col-12">
                                    <label className="small fw-bold mb-1">Specialization</label>
                                    <input type="text" className="form-control bg-light border-0 shadow-none" value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})} required />
                                </div>
                                <div className="col-12 mt-3">
                                    <label className="small fw-bold mb-1 text-primary d-flex align-items-center gap-1">
                                        <Link size={14}/> Connect to System User
                                    </label>
                                    <select 
                                        className="form-select bg-light border-0 shadow-none" 
                                        value={formData.user.id} 
                                        onChange={e => setFormData({...formData, user: { id: e.target.value }})}
                                        required
                                    >
                                        <option value="">-- Choose Account --</option>
                                        {availableUsers.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.username} ({user.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer border-0 bg-white">
                            <button type="button" className="btn btn-light fw-bold" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" className="btn px-4 fw-bold" style={{ backgroundColor: blackColor, color: goldColor }} disabled={photoProcessing}>
                                {isEditing ? 'Update' : 'Register'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TeacherList;