import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Search, Edit2, X, Save, User } from 'lucide-react'; 
import API from '../services/api';

const SubjectManagement = () => {
    const [subjects, setSubjects] = useState([]);
    const [users, setUsers] = useState([]); // NEW: State for staff/users
    const [loading, setLoading] = useState(true);
    // NEW: Added userId to the subject object
    const [newSubject, setNewSubject] = useState({ name: '', subjectCode: '', category: 'Core', userId: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    useEffect(() => {
        fetchSubjects();
        fetchUsers(); // NEW: Fetch users on mount
    }, []);

    const fetchSubjects = async () => {
        try {
            const res = await API.get('/subjects');
            setSubjects(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching subjects", err);
        }
    };

    // NEW: Fetch users from your API
    const fetchUsers = async () => {
        try {
            const res = await API.get('/users'); // Ensure this endpoint exists
            setUsers(res.data);
        } catch (err) {
            console.error("Error fetching users", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await API.put(`/subjects/${editId}`, newSubject);
            } else {
                await API.post('/subjects', newSubject);
            }
            resetForm();
            fetchSubjects();
        } catch (err) {
            alert(err.response?.data || "An error occurred.");
        }
    };

    const handleEditClick = (subject) => {
        setIsEditing(true);
        setEditId(subject.id);
        setNewSubject({
            name: subject.name,
            subjectCode: subject.subjectCode,
            category: subject.category,
            userId: subject.user?.id || '' // Link existing staff if present
        });
    };

    const resetForm = () => {
        setNewSubject({ name: '', subjectCode: '', category: 'Core', userId: '' });
        setIsEditing(false);
        setEditId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this subject?")) {
            await API.delete(`/subjects/${id}`);
            fetchSubjects();
        }
    };

    const filteredSubjects = subjects.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.subjectCode.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 animate__animated animate__fadeIn">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-black text-uppercase mb-0">
                    <BookOpen className="me-2" size={28} /> Subject Registry
                </h3>
            </div>

            <div className="row g-4">
                <div className="col-md-4">
                    <div className={`card border-0 shadow-sm rounded-4 p-4 ${isEditing ? 'border-top border-primary border-4' : ''}`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold mb-0 text-uppercase small text-muted">
                                {isEditing ? 'Edit Subject' : 'Add New Subject'}
                            </h6>
                            {isEditing && (
                                <button className="btn btn-sm btn-light rounded-circle" onClick={resetForm}>
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Subject Name</label>
                                <input
                                    type="text"
                                    className="form-control rounded-3"
                                    value={newSubject.name}
                                    onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Subject Code</label>
                                <input
                                    type="text"
                                    className="form-control rounded-3"
                                    value={newSubject.subjectCode}
                                    onChange={(e) => setNewSubject({...newSubject, subjectCode: e.target.value.toUpperCase()})}
                                    required
                                />
                            </div>

                            {/* NEW: Staff Selection Dropdown */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Assign Staff</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-white"><User size={16}/></span>
                                    <select
                                        className="form-select rounded-3"
                                        value={newSubject.userId}
                                        onChange={(e) => setNewSubject({...newSubject, userId: e.target.value})}
                                        required
                                    >
                                        <option value="">Select Staff Member</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.username} {/* Change to user.name if applicable */}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label small fw-bold">Category</label>
                                <select
                                    className="form-select rounded-3"
                                    value={newSubject.category}
                                    onChange={(e) => setNewSubject({...newSubject, category: e.target.value})}
                                >
                                    <option value="Core">Core</option>
                                    <option value="Elective">Elective</option>
                                    <option value="Extra-Curricular">Extra-Curricular</option>
                                </select>
                            </div>
                            <button type="submit" className={`btn ${isEditing ? 'btn-primary' : 'btn-dark'} w-100 rounded-3 d-flex align-items-center justify-content-center gap-2`}>
                                {isEditing ? <Save size={18} /> : <Plus size={18} />} 
                                {isEditing ? 'Update Subject' : 'Save Subject'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="col-md-8">
                    <div className="card border-0 shadow-sm rounded-4 p-0 overflow-hidden">
                        {/* Search and Table logic remains the same */}
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-dark">
                                    <tr>
                                        <th className="ps-4">Code</th>
                                        <th>Name</th>
                                        <th>Assigned Staff</th> {/* NEW Column */}
                                        <th>Category</th>
                                        <th className="text-end pe-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubjects.map((subject) => (
                                        <tr key={subject.id} className={editId === subject.id ? 'table-primary' : ''}>
                                            <td className="ps-4"><code className="text-primary fw-bold">{subject.subjectCode}</code></td>
                                            <td className="fw-bold">{subject.name}</td>
                                            <td>
                                                {/* Display assigned user name */}
                                                <small className="text-muted">
                                                    {subject.user ? subject.user.username : 'Unassigned'}
                                                </small>
                                            </td>
                                            <td><span className="badge bg-secondary">{subject.category}</span></td>
                                            <td className="text-end pe-4">
                                                <button onClick={() => handleEditClick(subject)} className="btn btn-outline-primary btn-sm rounded-circle me-2">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(subject.id)} className="btn btn-outline-danger btn-sm rounded-circle">
                                                    <Trash2 size={14} />
                                                </button>
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

export default SubjectManagement;