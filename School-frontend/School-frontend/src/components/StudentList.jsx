import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as bootstrap from 'bootstrap';
import API from '../services/api';
import * as XLSX from 'xlsx';
import {
    UserPlus, Trash2, Search, Edit, Eye, User, Printer, CheckSquare, Square, Loader2, Download, Upload
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
    const [importing, setImporting] = useState(false);
    const [importMessage, setImportMessage] = useState('');
    const fileInputRef = useRef(null);
    const idSliderRef = useRef(null);
    const [schoolConfig, setSchoolConfig] = useState({
        schoolName: 'ASONKWAA M/A BASIC SCHOOL',
        logoUrl: '',
        motto: 'Knowledge is Power',
        signatureUrl: '',
        headTeacherSign: '',
        headMasterName: 'The Headmaster'
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

            if (setRes.data) {
                setSchoolConfig(prev => ({
                    ...prev,
                    ...setRes.data,
                    signatureUrl: setRes.data.headTeacherSign || setRes.data.signatureUrl || prev.signatureUrl,
                    headTeacherSign: setRes.data.headTeacherSign || setRes.data.signatureUrl || prev.headTeacherSign,
                    headMasterName: setRes.data.headMasterName || prev.headMasterName,
                    motto: setRes.data.motto || prev.motto
                }));
            }
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

    const normalizeImportedRow = (row) => {
        const normalized = {};
        const aliases = {
            admissionnumber: 'admissionNumber',
            admission_no: 'admissionNumber',
            admissionno: 'admissionNumber',
            firstname: 'firstName',
            first_name: 'firstName',
            lastname: 'lastName',
            last_name: 'lastName',
            classname: 'className',
            class: 'className',
            gradelevel: 'gradeLevel',
            grade_level: 'gradeLevel',
            gender: 'gender',
            dateofbirth: 'dateOfBirth',
            dob: 'dateOfBirth',
            parentname: 'parentName',
            guardianname: 'parentName',
            parentcontact: 'parentContact',
            guardiancontact: 'parentContact',
            parentemail: 'parentEmail',
            guardianemail: 'parentEmail',
            homeaddress: 'homeAddress',
            address: 'homeAddress',
            studentphoto: 'studentPhoto'
        };

        Object.entries(row || {}).forEach(([key, value]) => {
            const normalizedKey = String(key).trim().toLowerCase();
            const targetKey = aliases[normalizedKey] || normalizedKey;
            normalized[targetKey] = value;
        });

        const className = normalized.className || normalized.gradeLevel || '';
        const gradeLevel = normalized.gradeLevel || normalized.className || '';

        return {
            id: null,
            firstName: normalized.firstName || '',
            lastName: normalized.lastName || '',
            admissionNumber: normalized.admissionNumber || '',
            gradeLevel,
            className,
            gender: normalized.gender || '',
            dateOfBirth: normalized.dateOfBirth || '',
            parentName: normalized.parentName || '',
            parentContact: normalized.parentContact || '',
            parentEmail: normalized.parentEmail || '',
            homeAddress: normalized.homeAddress || '',
            studentPhoto: normalized.studentPhoto || '',
            enabled: true
        };
    };

    const handleCsvImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportMessage('');

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (!rows.length) {
                throw new Error('The selected file does not contain any rows.');
            }

            const studentsToImport = rows
                .map(normalizeImportedRow)
                .filter(item => item.firstName || item.lastName || item.admissionNumber);

            if (!studentsToImport.length) {
                throw new Error('No recognizable student records were found.');
            }

            let successCount = 0;
            let failureCount = 0;

            for (const student of studentsToImport) {
                try {
                    await API.post('/students', {
                        ...student,
                        gradeLevel: student.className || student.gradeLevel,
                        className: student.className || student.gradeLevel,
                        homeAddress: student.homeAddress || '',
                        enabled: true
                    }, {
                        headers: { 'Content-Type': 'application/json' }
                    });
                    successCount += 1;
                } catch (err) {
                    failureCount += 1;
                    console.error('Import row error:', err);
                }
            }

            await fetchData();
            setImportMessage(`${successCount} student${successCount === 1 ? '' : 's'} imported${failureCount ? `; ${failureCount} failed` : ''}.`);
            new bootstrap.Toast(document.getElementById('successToast')).show();
        } catch (err) {
            console.error('CSV import error:', err);
            setImportMessage(err.message || 'Unable to import the selected file.');
        } finally {
            setImporting(false);
            e.target.value = '';
        }
    };

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

            setFormData({
                id: null, firstName: '', lastName: '', admissionNumber: '',
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
        if (window.confirm("Archive this learner? They will leave active lists, but attendance, fee and academic records will be retained.")) {
            try {
                await API.delete(`/students/${id}`);
                await fetchData();
                setSelectedIDs(prev => prev.filter(item => item !== id));
            } catch (err) {
                alert(err.response?.data?.message || "Unable to archive learner.");
            }
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

    const scrollIdSlider = (direction) => {
        if (!idSliderRef.current) return;
        const amount = 360;
        idSliderRef.current.scrollBy({
            left: direction === 'next' ? amount : -amount,
            behavior: 'smooth'
        });
    };

    return (
        <div className="container-fluid py-4 text-start bg-light min-vh-100">
            <style>
                {`
                .student-id-slider {
                    display: flex;
                    gap: 18px;
                    overflow-x: auto;
                    scroll-snap-type: x proximity;
                    padding: 8px 4px 16px;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(13, 110, 253, 0.45) transparent;
                }
                .student-id-slider::-webkit-scrollbar {
                    height: 8px;
                }
                .student-id-slider::-webkit-scrollbar-thumb {
                    background: rgba(13, 110, 253, 0.35);
                    border-radius: 999px;
                }
                .theme-id-card {
                    min-width: 330px;
                    max-width: 330px;
                    height: 210px;
                    border-radius: 18px;
                    overflow: hidden;
                    background: linear-gradient(135deg, #0f172a 0%, #111827 32%, #1f2937 100%);
                    color: #f8fafc;
                    border: 1px solid rgba(148, 163, 184, 0.35);
                    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.18);
                    scroll-snap-align: start;
                    position: relative;
                }
                .theme-id-card::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(120deg, rgba(59, 130, 246, 0.18), transparent 52%, rgba(148, 163, 184, 0.12));
                    pointer-events: none;
                }
                .theme-id-card-header {
                    background: linear-gradient(135deg, rgba(13, 110, 253, 0.9), rgba(15, 118, 110, 0.85));
                    padding: 10px 12px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    position: relative;
                    z-index: 1;
                }
                .theme-id-card-body {
                    display: flex;
                    gap: 12px;
                    padding: 14px 12px 8px;
                    position: relative;
                    z-index: 1;
                }
                .theme-id-photo {
                    width: 88px;
                    height: 104px;
                    border-radius: 12px;
                    overflow: hidden;
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.22);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .theme-id-meta {
                    flex: 1;
                    min-width: 0;
                    padding-right: 90px;
                    color: #e2e8f0;
                }
                .theme-id-name {
                    margin: 0 0 6px;
                    font-size: 13px;
                    font-weight: 700;
                    letter-spacing: 0.3px;
                    text-transform: uppercase;
                    color: #f8fafc;
                }
                .theme-id-row {
                    font-size: 9.5px;
                    margin: 3px 0;
                    color: #dbeafe;
                }
                .theme-id-label {
                    font-weight: 700;
                    color: #93c5fd;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                }
                .theme-id-signature {
                    position: absolute;
                    right: 16px;
                    bottom: 26px;
                    width: 86px;
                    text-align: center;
                }
                .theme-signature-line {
                    border-top: 1px solid rgba(255,255,255,0.8);
                    width: 70px;
                    margin: 4px auto 0;
                }
                .theme-card-footer {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 6px 8px;
                    text-align: center;
                    background: rgba(2, 6, 23, 0.85);
                    color: #bfdbfe;
                    font-size: 8px;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    border-top: 1px solid rgba(148, 163, 184, 0.35);
                    z-index: 1;
                }

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
                        width: 340px; height: 220px; border: 1px solid rgba(148,163,184,0.7);
                        border-radius: 16px; overflow: hidden; background: linear-gradient(135deg, #0f172a 0%, #111827 35%, #1f2937 100%);
                        position: relative; -webkit-print-color-adjust: exact;
                        font-family: 'Segoe UI', sans-serif; margin-bottom: 15px;
                        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.15);
                    }
                    .card-header-gold {
                        background: linear-gradient(135deg, rgba(13,110,253,0.9), rgba(15,118,110,0.8));
                        color: #f8fafc; padding: 8px 10px;
                        text-align: center; border-bottom: 2px solid #D4AF37;
                        display: flex; align-items: center; justify-content: center; gap: 10px;
                    }
                    .photo-box-gold {
                        width: 88px; height: 108px; border: 2px solid #D4AF37;
                        border-radius: 10px; overflow: hidden; background: #f8f9fa;
                        box-shadow: inset 0 0 0 1px rgba(212, 175, 55, 0.4);
                    }
                    .gold-text { color: #93c5fd; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .card-footer-gold {
                        position: absolute; bottom: 0; width: 100%;
                        background: rgba(2, 6, 23, 0.85);
                        color: #bfdbfe; font-size: 8px; letter-spacing: 0.8px;
                        text-align: center; padding: 5px 0; border-top: 1px solid #D4AF37;
                    }
                    .signature-box {
                        position: absolute; bottom: 26px; right: 16px; text-align: center; width: 90px;
                    }
                    .signature-line {
                        border-top: 1px solid rgba(255,255,255,0.7); width: 82px; margin: 2px auto 0 auto;
                    }
                    .student-name {
                        margin: 0 0 4px 0;
                        font-size: 13px;
                        font-weight: 800;
                        color: #f8fafc;
                        text-transform: uppercase;
                        letter-spacing: 0.3px;
                    }
                    .info-row {
                        font-size: 9px;
                        margin: 2px 0;
                        color: #dbeafe;
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
                <div className="d-flex gap-2 flex-wrap justify-content-end">
                    <div className="input-group" style={{ maxWidth: '200px' }}>
                        <span className="input-group-text bg-white border-end-0"><Search size={16} className="text-muted"/></span>
                        <input type="text" className="form-control border-start-0 shadow-none form-control-sm" placeholder="Search..." onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                        {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import CSV
                    </button>
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="d-none" onChange={handleCsvImport} />
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
            {importMessage && (
                <div className="alert alert-info py-2 px-3 mb-3 small no-print">{importMessage}</div>
            )}

            <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 no-print">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <div>
                        <h5 className="fw-bold mb-0">Student ID Cards</h5>
                        <small className="text-muted">Swipe or drag across to view cards</small>
                    </div>
                    <div className="d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => scrollIdSlider('prev')} aria-label="Previous ID card">←</button>
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => scrollIdSlider('next')} aria-label="Next ID card">→</button>
                    </div>
                </div>

                <div ref={idSliderRef} className="student-id-slider">
                    {getPrintData().length > 0 ? (
                        getPrintData().map(s => (
                            <div key={s.id} className="theme-id-card">
                                <div className="theme-id-card-header">
                                    {schoolConfig.logoUrl ? (
                                        <img src={schoolConfig.logoUrl} alt="school logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
                                    ) : null}
                                    <div className="text-start">
                                        <div style={{ fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{schoolConfig.schoolName}</div>
                                        <div style={{ fontSize: '6px', opacity: 0.9, letterSpacing: '1px' }}>STUDENT IDENTITY CARD</div>
                                    </div>
                                </div>

                                <div className="theme-id-card-body">
                                    <div className="theme-id-photo">
                                        {s.studentPhoto ? (
                                            <img src={s.studentPhoto} alt="student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <User size={26} className="text-white-50" />
                                        )}
                                    </div>

                                    <div className="theme-id-meta">
                                        <h6 className="theme-id-name">{s.firstName} {s.lastName}</h6>
                                        <div className="theme-id-row"><span className="theme-id-label">ID:</span> {s.admissionNumber}</div>
                                        <div className="theme-id-row"><span className="theme-id-label">Class:</span> {s.className || s.gradeLevel}</div>
                                        <div className="theme-id-row"><span className="theme-id-label">Gender:</span> {s.gender || 'N/A'}</div>
                                        <div className="theme-id-row"><span className="theme-id-label">DOB:</span> {s.dateOfBirth || 'N/A'}</div>
                                    </div>

                                    <div className="theme-id-signature">
                                        {(schoolConfig.headTeacherSign || schoolConfig.signatureUrl) ? (
                                            <img src={schoolConfig.headTeacherSign || schoolConfig.signatureUrl} alt="signature" style={{ height: '23px', width: 'auto', display: 'block', margin: '0 auto' }} />
                                        ) : null}
                                        <div className="theme-signature-line"></div>
                                        <div style={{ fontSize: '6px', fontWeight: 700, marginTop: '3px', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#e2e8f0' }}>
                                            {schoolConfig.headMasterName || 'Headmaster'}
                                        </div>
                                    </div>
                                </div>

                                <div className="theme-card-footer">{schoolConfig.motto}</div>
                            </div>
                        ))
                    ) : (
                        <div className="text-muted small px-3 py-4">Select students to preview ID cards.</div>
                    )}
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
                                            <span className={`badge student-class-badge ${getBadgeClass(s.className || s.gradeLevel)} bg-opacity-10 text-${getBadgeClass(s.className || s.gradeLevel).replace('bg-', '')} border border-${getBadgeClass(s.className || s.gradeLevel).replace('bg-', '')}`}>
                                                {s.className || s.gradeLevel}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center gap-1">
                                                <button onClick={() => openViewModal(s)} className="btn btn-sm btn-light text-info"><Eye size={16}/></button>
                                                <button onClick={() => openAddModal(s)} className="btn btn-sm btn-light text-warning"><Edit size={16}/></button>
                                                <button onClick={() => handleDelete(s.id)} className="btn btn-sm btn-light text-danger" title="Archive learner" aria-label="Archive learner"><Trash2 size={16}/></button>
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
                                <img src={schoolConfig.logoUrl} alt="logo" style={{width:'30px', height:'30px', objectFit:'contain'}} />
                            )}
                            <div className="text-center">
                                <div style={{fontSize:'10px', fontWeight:'800', textTransform:'uppercase', letterSpacing:'0.6px'}}>{schoolConfig.schoolName}</div>
                                <div style={{fontSize:'6px', letterSpacing:'1px', opacity: 0.9}}>STUDENT IDENTITY CARD</div>
                            </div>
                        </div>
                        <div style={{display:'flex', padding:'10px 10px 12px', gap:'10px', position:'relative'}}>
                            <div className="photo-box-gold">
                                {s.studentPhoto ? <img src={s.studentPhoto} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="card-photo" /> : <User size={28} style={{margin:'38px 28px', color:'#7a7a7a'}} />}
                            </div>
                            <div style={{flex:1, textAlign:'left', paddingRight:'88px'}}>
                                <h5 className="student-name">{s.firstName} {s.lastName}</h5>
                                <div className="info-row"><span className="gold-text">ID:</span> {s.admissionNumber}</div>
                                <div className="info-row"><span className="gold-text">CLASS:</span> {s.className || s.gradeLevel}</div>
                                <div className="info-row"><span className="gold-text">GENDER:</span> {s.gender || 'N/A'}</div>
                                <div className="info-row"><span className="gold-text">DOB:</span> {s.dateOfBirth || 'N/A'}</div>
                            </div>

                            <div className="signature-box">
                                {(schoolConfig.headTeacherSign || schoolConfig.signatureUrl) ? (
                                    <img src={schoolConfig.headTeacherSign || schoolConfig.signatureUrl} alt="headmaster-signature" style={{height:'28px', width:'auto', display:'block', margin:'0 auto', filter:'drop-shadow(0 2px 2px rgba(0,0,0,0.08))'}} />
                                ) : (
                                    <div style={{height:'28px'}}></div>
                                )}
                                <div className="signature-line"></div>
                                <div style={{fontSize:'6px', fontWeight:'bold', marginTop:'2px', color:'#1a1a1a', textTransform:'uppercase'}}>{schoolConfig.headMasterName || 'Headmaster'}</div>
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
                                            <input type="text" className="form-control form-control-sm bg-white fw-bold" value={formData.admissionNumber || 'Assigned when saved'} readOnly />
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