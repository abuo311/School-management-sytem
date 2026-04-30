import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { LayoutGrid, Loader2, RefreshCw, Edit3, X, UserCheck, Save, Trash2 } from 'lucide-react';

const ClassSettings = () => {
    const [classes, setClasses] = useState([]);
    const [availableMasters, setAvailableMasters] = useState([]); 
    const [newClassName, setNewClassName] = useState('');
    const [selectedMaster, setSelectedMaster] = useState('');
    
    const [selectedClass, setSelectedClass] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const goldColor = '#d4af37';

    useEffect(() => {
        fetchClasses();
        fetchAvailableMasters();
    }, []);

    const fetchAvailableMasters = async () => {
        try {
            const res = await API.get('/settings');
            if (res.data && res.data.formMasters) {
                setAvailableMasters(res.data.formMasters);
            }
        } catch (err) {
            console.error("Error loading masters from settings:", err);
        }
    };

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const res = await API.get('/classes');
            setClasses(res.data || []);
        } finally { setLoading(false); }
    };

    const handleAddOrUpdate = async (e) => {
        if (e) e.preventDefault();
        if (!newClassName.trim()) return alert("Class name is required");
        
        setActionLoading(true);
        const payload = { 
            className: newClassName.toUpperCase().trim(), 
            formMasterName: selectedMaster 
        };

        try {
            if (selectedClass) {
                await API.put(`/classes/${selectedClass.id}`, payload);
            } else {
                await API.post('/classes', payload);
            }
            resetForm();
            fetchClasses();
        } catch (err) {
            alert(err.response?.data?.message || "Error saving class");
        } finally { setActionLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure? This may affect student records.")) return;
        try {
            await API.delete(`/classes/${id}`);
            fetchClasses();
        } catch (err) {
            alert("Delete failed. Class might have linked students.");
        }
    };

    const resetForm = () => {
        setSelectedClass(null);
        setNewClassName('');
        setSelectedMaster('');
    };

    // Helper to find signature image from the masters list
    const getMasterSignature = (name) => {
        const master = availableMasters.find(m => m.name === name);
        return master ? master.signature : null;
    };

    return (
        <div className="container-fluid py-4 text-start">
            <header className="mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h3 className="fw-bold m-0">Class Registry</h3>
                    <p className="text-muted small mb-0">Manage classes and assign form masters</p>
                </div>
                <button className="btn btn-sm btn-outline-dark rounded-pill px-3" onClick={() => { fetchClasses(); fetchAvailableMasters(); }}>
                    <RefreshCw size={14} className={loading ? 'spin me-1' : 'me-1'} /> Sync Data
                </button>
            </header>

            <div className="row g-4">
                {/* Form Section */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm p-4 rounded-4 bg-white" 
                         style={{ borderTop: `6px solid ${selectedClass ? goldColor : '#1a1a1a'}` }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h6 className="fw-bold text-uppercase m-0">
                                {selectedClass ? 'Edit Assignment' : 'New Class'}
                            </h6>
                            {selectedClass && (
                                <button className="btn btn-sm text-danger border-0" onClick={resetForm}>
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                        
                        <form onSubmit={handleAddOrUpdate}>
                            <div className="mb-3">
                                <label className="small fw-bold text-muted mb-1">Class Name</label>
                                <input className="form-control border-2 shadow-none" value={newClassName} 
                                    onChange={e => setNewClassName(e.target.value)} placeholder="e.g. JHS 1A" />
                            </div>

                            <div className="mb-4">
                                <label className="small fw-bold text-muted mb-1">Assign Form Master</label>
                                <select className="form-select border-2 shadow-none" value={selectedMaster} 
                                    onChange={e => setSelectedMaster(e.target.value)}>
                                    <option value="">-- No Master Assigned --</option>
                                    {availableMasters.map((m, i) => (
                                        <option key={i} value={m.name}>{m.name || `Unnamed Master ${i+1}`}</option>
                                    ))}
                                </select>
                                <small className="text-muted mt-2 d-block px-1" style={{ fontSize: '0.75rem' }}>
                                    Assigning a master enables their signature on report cards.
                                </small>
                            </div>

                            <button className={`btn w-100 py-3 fw-bold shadow-sm ${selectedClass ? 'btn-warning' : 'btn-dark'}`} 
                                    disabled={actionLoading} style={selectedClass ? { color: '#000' } : {}}>
                                {actionLoading ? <Loader2 className="spin" /> : (selectedClass ? 'UPDATE CHANGES' : 'SAVE CLASS')}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm p-4 rounded-4 bg-white">
                        {loading ? (
                            <div className="text-center py-5"><Loader2 className="spin text-muted" /></div>
                        ) : (
                            <div className="row g-3">
                                {classes.length === 0 && <div className="text-center text-muted py-4">No classes found.</div>}
                                {classes.map(c => (
                                    <div key={c.id} className="col-md-6">
                                        <div className="p-3 border rounded-4 d-flex justify-content-between align-items-center bg-white hover-shadow-sm transition">
                                            <div className="d-flex align-items-center gap-3">
                                                <div className="rounded-3 bg-light p-2 text-dark fw-bold" style={{ minWidth: '60px', textAlign: 'center' }}>
                                                    {c.className}
                                                </div>
                                                <div>
                                                    <div className="small text-muted d-flex align-items-center gap-1">
                                                        <UserCheck size={12} /> {c.formMasterName || 'Unassigned'}
                                                    </div>
                                                    {c.formMasterName && (
                                                        <div className="mt-1">
                                                            {getMasterSignature(c.formMasterName) ? 
                                                                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill" style={{ fontSize: '0.65rem' }}>Signature Ready</span> : 
                                                                <span className="badge bg-warning-subtle text-warning border border-warning-subtle rounded-pill" style={{ fontSize: '0.65rem' }}>No Signature</span>
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="d-flex gap-1">
                                                <button className="btn btn-light btn-sm rounded-circle shadow-none" 
                                                    onClick={() => {
                                                        setSelectedClass(c);
                                                        setNewClassName(c.className);
                                                        setSelectedMaster(c.formMasterName || '');
                                                    }}><Edit3 size={15}/></button>
                                                <button className="btn btn-light btn-sm rounded-circle text-danger shadow-none" 
                                                    onClick={() => handleDelete(c.id)}><Trash2 size={15}/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClassSettings;