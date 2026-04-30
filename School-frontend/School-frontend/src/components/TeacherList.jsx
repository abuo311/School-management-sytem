import React, { useState, useEffect, useCallback } from 'react';
import * as bootstrap from 'bootstrap';
import API from '../services/api';
import { UserPlus, Trash2, Search, Edit, User, Link } from 'lucide-react';

const TeacherList = () => {
    const [teachers, setTeachers] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const goldColor = '#d4af37';
    const blackColor = '#1a1a1a';

    const [formData, setFormData] = useState({
        id: null,
        firstName: '',
        lastName: '',
        email: '',
        specialization: '',
        user: { id: '' }
    });

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

    useEffect(() => {
        fetchTeachers();
        fetchUsers();
        return () => {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(b => b.remove());
        };
    }, [fetchTeachers, fetchUsers]);

    const handleOpenModal = (teacher = null) => {
        if (teacher) {
            setIsEditing(true);
            setFormData({
                id: teacher.id || null,
                firstName: teacher.firstName || '',
                lastName: teacher.lastName || '',
                email: teacher.email || '',
                specialization: teacher.specialization || '',
                user: { id: teacher.user?.id || '' }
            });

            // Ensure the currently linked user is in the dropdown options
            if (teacher.user && !availableUsers.find(u => u.id === teacher.user.id)) {
                setAvailableUsers(prev => [teacher.user, ...prev]);
            }
        } else {
            setIsEditing(false);
            setFormData({ id: null, firstName: '', lastName: '', email: '', specialization: '', user: { id: '' } });
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
                    <p className="text-muted small">Manage faculty records and system links</p>
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
                                    <td className="px-4 fw-bold text-dark">{t.firstName} {t.lastName}</td>
                                    <td>
                                        <span className="badge rounded-pill px-3 py-2"
                                              style={{ backgroundColor: `${goldColor}15`, color: blackColor, border: `1px solid ${goldColor}50` }}>
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
                            <button type="submit" className="btn px-4 fw-bold" style={{ backgroundColor: blackColor, color: goldColor }}>
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