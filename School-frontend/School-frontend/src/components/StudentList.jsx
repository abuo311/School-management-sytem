import React, { useState, useEffect, useCallback } from 'react';
import * as bootstrap from 'bootstrap';
import API from '../services/api';
import * as XLSX from 'xlsx';
import {
    UserPlus, Trash2, Search, Edit, Eye, User, Printer, CheckSquare, Square, Loader2, Download
} from 'lucide-react';

const StudentList = () => {
    // --- State Management ---
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [classCategories, setClassCategories] = useState([]);
    const [selectedIDs, setSelectedIDs] = useState([]);
    const [isPrintingSingle, setIsPrintingSingle] = useState(false);
    const [schoolConfig, setSchoolConfig] = useState({
        schoolName: 'ASONKWAA M/A BASIC SCHOOL',
        logoUrl: '',
        motto: 'Knowledge is Power',
        signatureUrl: '' // Added for signature support
    });

    const [photoPreview, setPhotoPreview] = useState(null);
    const [formData, setFormData] = useState({
        id: null, firstName: '', lastName: '', admissionNumber: '',
        gradeLevel: '', className: '', gender: '', dateOfBirth: '',
        parentName: '', parentContact: '', parentEmail: '', homeAddress: '',
        studentPhoto: ''
    });

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [stuRes, classRes, setRes] = await Promise.all([
                API.get('/students'),
                API.get('/classes'),
                API.get('/settings').catch(() => ({ data: null }))
            ]);

            setStudents(stuRes.data || []);
            const classes = classRes.data.map(c => typeof c === 'string' ? c : c.className);
            setClassCategories(classes || []);

            if (setRes.data) setSchoolConfig(setRes.data);
        } catch (err) {
            console.error("Initialization error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredStudents = (students || []).filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- Selection Handlers ---
    const toggleSelect = (id) => {
        setSelectedIDs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = () => {
        if (selectedIDs.length === filteredStudents.length && filteredStudents.length > 0) {
            setSelectedIDs([]);
        } else {
            setSelectedIDs(filteredStudents.map(s => s.id));
        }
    };

    const getBadgeClass = (className) => {
        const name = className?.toLowerCase() || '';
        if (name.includes('jhs')) return 'bg-primary';
        if (name.includes('class')) return 'bg-success';
        if (name.includes('kg')) return 'bg-warning text-dark';
        return 'bg-secondary';
    };

    // --- Photo Handler ---
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert("File is too large. Please select an image under 2MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.src = reader.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 250; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                setPhotoPreview(compressedBase64);
                setFormData(prev => ({ ...prev, studentPhoto: compressedBase64 }));
            };
        };
        reader.readAsDataURL(file);
    };

    // --- Open Modal Logic ---
    // --- Open Modal Logic ---
    const openAddModal = async (student = null) => {
        if (student) {
            setIsEditing(true);
            setPhotoPreview(student.studentPhoto || null);
            setFormData({
                ...student,
                homeAddress: student.homeAddress || student.address || '', 
                className: student.className || student.gradeLevel || '',
                gradeLevel: student.gradeLevel || student.className || ''
            });
        } else {
            setIsEditing(false);
            setPhotoPreview(null);
            
            // --- PATTERN CHANGE: ADM-YEAR-SEQUENCE ---
            const currentYear = new Date().getFullYear();
            let nextNo = `ADM-${currentYear}-0001`;

            if (students.length > 0) {
                // Find students from the current year pattern
                const yearPrefix = `ADM-${currentYear}-`;
                const yearStudents = students.filter(s => s.admissionNumber?.startsWith(yearPrefix));

                if (yearStudents.length > 0) {
                    const lastNums = yearStudents.map(s => {
                        const parts = s.admissionNumber.split('-');
                        return parseInt(parts[2]) || 0;
                    });
                    const maxNum = Math.max(...lastNums);
                    nextNo = `ADM-${currentYear}-${String(maxNum + 1).padStart(4, '0')}`;
                }
            }

            setFormData({
                id: null, firstName: '', lastName: '', admissionNumber: nextNo,
                gradeLevel: '', className: '', dateOfBirth: '', gender: '',
                parentName: '', parentContact: '', parentEmail: '', homeAddress: '',
                studentPhoto: ''
            });
        }
        const modalElem = document.getElementById('addStudentModal');
        bootstrap.Modal.getOrCreateInstance(modalElem).show();
    };
    // --- Submit Logic ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const dataToSave = {
            ...formData,
            homeAddress: formData.homeAddress, // Force explicit mapping
            gradeLevel: formData.className,   // Sync naming conventions
            className: formData.className,
            enabled: true
        };

        try {
            const config = { headers: { 'Content-Type': 'application/json' } };

            if (isEditing) {
                await API.put(`/students/${formData.id}`, dataToSave, config);
            } else {
                await API.post('/students', dataToSave, config);
            }

            await fetchData();
            const modalElem = document.getElementById('addStudentModal');
            bootstrap.Modal.getInstance(modalElem).hide();
            new bootstrap.Toast(document.getElementById('successToast')).show();
        } catch (err) {
            console.error("Submit Error:", err.response?.data || err);
            alert("Error saving record. Check console for 415/Relationship details.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this student?")) {
            try {
                await API.delete(`/students/${id}`);
                fetchData();
                setSelectedIDs(prev => prev.filter(item => item !== id));
            } catch (err) { console.error(err); }
        }
    };

    const downloadExcel = () => {
        const dataToExport = filteredStudents.map(s => ({
            "Admission No": s.admissionNumber,
            "First Name": s.firstName,
            "Last Name": s.lastName,
            "Gender": s.gender,
            "Class": s.className || s.gradeLevel,
            "DOB": s.dateOfBirth,
            "Guardian": s.parentName,
            "Contact": s.parentContact,
            "Address": s.homeAddress
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
        XLSX.writeFile(workbook, `Student_Registry_${new Date().getFullYear()}.xlsx`);
    };

    const openViewModal = (student) => {
        setSelectedStudent(student);
        setIsPrintingSingle(false);
        const modalElem = document.getElementById('viewStudentModal');
        bootstrap.Modal.getOrCreateInstance(modalElem).show();
    };

    const handleSinglePrint = () => {
        setIsPrintingSingle(true);
        setTimeout(() => { window.print(); }, 100);
    };

    const handleBulkPrint = () => {
        setIsPrintingSingle(false);
        setTimeout(() => { window.print(); }, 100);
    };

    const getPrintData = () => {
        if (isPrintingSingle && selectedStudent) return [selectedStudent];
        return students.filter(s => selectedIDs.includes(s.id));
    };

    return (
        <div className="container-fluid py-4 text-start bg-light min-vh-100">
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area {
                        position: absolute; left: 0; top: 0; width: 100%;
                        display: flex !important; flex-wrap: wrap; gap: 20px;
                        justify-content: center; padding: 20px;
                    }
                    .no-print { display: none !important; }
                    .id-card-item {
                        width: 325px; height: 210px; border: 2px solid #D4AF37;
                        border-radius: 12px; overflow: hidden; background: #fff;
                        position: relative; -webkit-print-color-adjust: exact;
                        font-family: 'Segoe UI', sans-serif; margin-bottom: 15px;
                    }
                    .card-header-gold {
                        background: #1a1a1a; color: #D4AF37; padding: 6px;
                        text-align: center; border-bottom: 2px solid #D4AF37;
                        display: flex; align-items: center; justify-content: center; gap: 10px;
                    }
                    .photo-box-gold {
                        width: 85px; height: 105px; border: 2px solid #D4AF37;
                        border-radius: 6px; overflow: hidden; background: #f8f9fa;
                    }
                    .gold-text { color: #AA8A2E; font-weight: bold; font-size: 10px; text-transform: uppercase; }
                    .card-footer-gold {
                        position: absolute; bottom: 0; width: 100%;
                        background: #1a1a1a; color: #D4AF37; font-size: 9px;
                        text-align: center; padding: 4px 0; border-top: 1px solid #D4AF37;
                    }
                    .signature-box {
                        position: absolute; bottom: 25px; right: 15px; text-align: center;
                    }
                    .signature-line {
                        border-top: 1px solid #1a1a1a; width: 80px; margin-top: 2px;
                    }
                }
                `}
            </style>

            <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
                <div id="successToast" className="toast align-items-center text-white bg-success border-0" role="alert">
                    <div className="d-flex">
                        <div className="toast-body">Student record processed successfully!</div>
                        <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4 no-print">
                <div>
                    <h3 className="fw-bold mb-0">Student Registry</h3>
                    <p className="text-muted small mb-0">{schoolConfig.schoolName}</p>
                </div>
                <div className="d-flex gap-2">
                    <div className="input-group" style={{ maxWidth: '200px' }}>
                        <span className="input-group-text bg-white border-end-0"><Search size={16} className="text-muted"/></span>
                        <input type="text" className="form-control border-start-0 shadow-none form-control-sm" placeholder="Search..." onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn btn-outline-success btn-sm d-flex align-items-center gap-2" onClick={downloadExcel}>
                        <Download size={16} /> Export
                    </button>
                    {selectedIDs.length > 0 && (
                        <button className="btn btn-dark btn-sm d-flex align-items-center gap-2 border-gold text-gold" onClick={handleBulkPrint}>
                            <Printer size={16} /> Print ({selectedIDs.length})
                        </button>
                    )}
                    <button className="btn btn-primary btn-sm d-flex align-items-center gap-2 shadow-sm" onClick={() => openAddModal()}>
                        <UserPlus size={16} /> Enroll
                    </button>
                </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 overflow-hidden no-print">
                {loading ? (
                    <div className="text-center py-5">
                        <Loader2 className="animate-spin text-primary mx-auto" size={40} />
                        <p className="text-muted mt-2">Loading students...</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light text-muted small text-uppercase">
                            <tr>
                                <th className="ps-4" style={{width: '50px'}}>
                                    <div onClick={handleSelectAll} style={{cursor: 'pointer'}}>
                                        {selectedIDs.length === filteredStudents.length && filteredStudents.length > 0
                                            ? <CheckSquare size={18} className="text-primary"/>
                                            : <Square size={18} className="text-muted"/>}
                                    </div>
                                </th>
                                <th>Photo</th>
                                <th>Admission No.</th>
                                <th>Full Name</th>
                                <th>Class</th>
                                <th className="text-center">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map(s => (
                                    <tr key={s.id} className={selectedIDs.includes(s.id) ? "table-light" : ""}>
                                        <td className="ps-4" onClick={() => toggleSelect(s.id)} style={{cursor: 'pointer'}}>
                                            {selectedIDs.includes(s.id) ? <CheckSquare size={18} className="text-primary"/> : <Square size={18} className="text-muted"/>}
                                        </td>
                                        <td>
                                            {s.studentPhoto ? <img src={s.studentPhoto} alt="Student" className="rounded-2" style={{width:'35px', height:'35px', objectFit:'cover'}} /> : <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{width:'35px', height:'35px'}}><User size={16} className="text-muted"/></div>}
                                        </td>
                                        <td className="fw-bold text-dark">{s.admissionNumber}</td>
                                        <td>{s.firstName} {s.lastName}</td>
                                        <td>
                                            <span className={`badge ${getBadgeClass(s.className || s.gradeLevel)} bg-opacity-10 text-${getBadgeClass(s.className || s.gradeLevel).replace('bg-', '')} border border-${getBadgeClass(s.className || s.gradeLevel).replace('bg-', '')}`}>
                                                {s.className || s.gradeLevel}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center gap-1">
                                                <button onClick={() => openViewModal(s)} className="btn btn-sm btn-light text-info"><Eye size={16}/></button>
                                                <button onClick={() => openAddModal(s)} className="btn btn-sm btn-light text-warning"><Edit size={16}/></button>
                                                <button onClick={() => handleDelete(s.id)} className="btn btn-sm btn-light text-danger"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="text-center py-4 text-muted">No records found.</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="d-none d-print-block print-area">
                {getPrintData().map(s => (
                    <div key={s.id} className="id-card-item">
                        <div className="card-header-gold">
                            {schoolConfig.logoUrl && (
                                <img src={schoolConfig.logoUrl} alt="logo" style={{width:'28px', height:'28px', objectFit:'contain'}} />
                            )}
                            <div className="text-center">
                                <div style={{fontSize:'10px', fontWeight:'bold', textTransform:'uppercase'}}>{schoolConfig.schoolName}</div>
                                <div style={{fontSize:'6px', letterSpacing:'1px', opacity: 0.9}}>STUDENT IDENTITY CARD</div>
                            </div>
                        </div>
                        <div style={{display:'flex', padding:'10px', gap:'10px'}}>
                            <div className="photo-box-gold">
                                {s.studentPhoto ? <img src={s.studentPhoto} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="card-photo" /> : <User size={30} style={{margin:'30px 25px', color:'#d4af37'}} />}
                            </div>
                            <div style={{flex:1, textAlign:'left'}}>
                                <h5 style={{fontSize:'14px', fontWeight:'800', margin:'0 0 3px 0', color:'#1a1a1a', textTransform:'uppercase'}}>{s.firstName} {s.lastName}</h5>
                                <div style={{fontSize:'9px'}}><span className="gold-text">ID:</span> {s.admissionNumber}</div>
                                <div style={{fontSize:'9px'}}><span className="gold-text">CLASS:</span> {s.className || s.gradeLevel}</div>
                                <div style={{fontSize:'9px'}}><span className="gold-text">GENDER:</span> {s.gender || 'N/A'}</div>
                                
                                <div className="signature-box">
                                    {schoolConfig.signatureUrl ? (
                                        <img src={schoolConfig.signatureUrl} alt="sig" style={{height:'20px', width:'auto', display:'block', margin:'0 auto'}} />
                                    ) : (
                                        <div style={{height:'20px'}}></div>
                                    )}
                                    <div className="signature-line"></div>
                                    <div style={{fontSize:'6px', fontWeight:'bold', marginTop:'2px'}}>PRINCIPAL</div>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer-gold">{schoolConfig.motto}</div>
                    </div>
                ))}
            </div>

            {/* ENROLL/UPDATE MODAL */}
            <div className="modal fade no-print" id="addStudentModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-lg">
                    <form className="modal-content border-0 shadow-lg" onSubmit={handleSubmit}>
                        <div className="modal-header bg-dark text-white border-bottom border-warning">
                            <h5 className="modal-title">{isEditing ? 'Update Student' : 'New Enrollment'}</h5>
                            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div className="modal-body bg-light text-start">
                            <div className="row g-3">
                                <div className="col-md-4 text-center">
                                    <div className="mx-auto bg-white border border-warning rounded shadow-sm p-1" style={{width:'110px', height:'125px', overflow:'hidden'}}>
                                        {photoPreview ? <img src={photoPreview} alt="preview" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <User size={40} className="mt-4 text-muted"/>}
                                    </div>
                                    <input type="file" accept="image/*" className="form-control form-control-sm mt-2 border-warning" onChange={handlePhotoChange} />
                                </div>
                                <div className="col-md-8">
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <label className="small fw-bold">First Name</label>
                                            <input type="text" className="form-control form-control-sm shadow-none" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                                        </div>
                                        <div className="col-6">
                                            <label className="small fw-bold">Last Name</label>
                                            <input type="text" className="form-control form-control-sm shadow-none" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required />
                                        </div>
                                        <div className="col-6">
                                            <label className="small fw-bold">Gender</label>
                                            <select className="form-select form-select-sm shadow-none" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} required>
                                                <option value="">Select...</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                        <div className="col-6">
                                            <label className="small fw-bold">Class</label>
                                            <select className="form-select form-select-sm shadow-none" value={formData.className} onChange={e => setFormData({...formData, className: e.target.value, gradeLevel: e.target.value})} required>
                                                <option value="">Select...</option>
                                                {classCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-6">
                                            <label className="small fw-bold">Date of Birth</label>
                                            <input type="date" className="form-control form-control-sm shadow-none" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
                                        </div>
                                        <div className="col-6">
                                            <label className="small fw-bold text-primary">Admission No.</label>
                                            <input type="text" className="form-control form-control-sm bg-white fw-bold" value={formData.admissionNumber} readOnly />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 mt-2 p-3 bg-white rounded shadow-sm">
                                    <h6 className="text-warning small fw-bold mb-2">Guardian Information</h6>
                                    <div className="row g-2">
                                        <div className="col-md-6"><input type="text" className="form-control form-control-sm shadow-none" placeholder="Guardian Name" value={formData.parentName} onChange={e => setFormData({...formData, parentName: e.target.value})} /></div>
                                        <div className="col-md-6"><input type="text" className="form-control form-control-sm shadow-none" placeholder="Guardian Phone" value={formData.parentContact} onChange={e => setFormData({...formData, parentContact: e.target.value})} /></div>
                                        <div className="col-md-12"><input type="email" className="form-control form-control-sm shadow-none" placeholder="Guardian Email" value={formData.parentEmail} onChange={e => setFormData({...formData, parentEmail: e.target.value})} /></div>
                                        <div className="col-md-12"><textarea className="form-control form-control-sm shadow-none" placeholder="Home Address" rows="2" value={formData.homeAddress} onChange={e => setFormData({...formData, homeAddress: e.target.value})}></textarea></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer bg-light">
                            <button type="submit" className="btn btn-dark btn-sm px-4 border-gold text-gold" disabled={submitting}>
                                {submitting ? <><Loader2 size={16} className="animate-spin me-2" /> Processing...</> : (isEditing ? 'Save Changes' : 'Enroll Student')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* VIEW MODAL */}
            <div className="modal fade no-print" id="viewStudentModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg">
                        <div className="modal-header bg-dark text-warning border-bottom border-gold">
                            <h5 className="modal-title">Student Profile</h5>
                            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div className="modal-body p-4 text-start">
                            {selectedStudent && (
                                <>
                                    <div className="text-center mb-4">
                                        <div className="mx-auto border border-warning rounded-circle mb-3 shadow-sm p-1" style={{width:'90px', height:'90px', overflow:'hidden'}}>
                                            {selectedStudent.studentPhoto ? <img src={selectedStudent.studentPhoto} alt="student" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <User size={40} className="mt-3 text-muted" />}
                                        </div>
                                        <h4 className="fw-bold mb-0">{selectedStudent.firstName} {selectedStudent.lastName}</h4>
                                        <span className="badge bg-dark text-gold mt-2 px-3">{selectedStudent.admissionNumber}</span>
                                    </div>
                                    <div className="bg-light p-3 rounded shadow-sm mb-4">
                                        <div className="row g-2">
                                            <div className="col-6 small"><strong>Class:</strong> {selectedStudent.className || selectedStudent.gradeLevel}</div>
                                            <div className="col-6 small"><strong>Gender:</strong> {selectedStudent.gender || 'N/A'}</div>
                                            <div className="col-6 small"><strong>DOB:</strong> {selectedStudent.dateOfBirth || 'N/A'}</div>
                                            <div className="col-12 border-top mt-2 pt-2 small"><strong>Guardian:</strong> {selectedStudent.parentName || 'N/A'}</div>
                                            <div className="col-12 small"><strong>Contact:</strong> {selectedStudent.parentContact || 'N/A'}</div>
                                            <div className="col-12 small"><strong>Address:</strong> {selectedStudent.homeAddress || 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div className="d-grid">
                                        <button className="btn btn-dark btn-sm d-flex align-items-center justify-content-center gap-2 border-gold text-gold" onClick={handleSinglePrint}>
                                            <Printer size={16} /> Print ID Card
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentList;