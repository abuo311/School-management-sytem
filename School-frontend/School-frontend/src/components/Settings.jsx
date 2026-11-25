import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Save, Building2, UserCheck, Signature, Plus, Trash2, Image as ImageIcon, Calendar, MessageSquare, MapPin, AlertTriangle, RotateCcw } from 'lucide-react';

const Settings = () => {
    const deriveStudentIdPrefix = (schoolName) => {
        const words = String(schoolName || '').toUpperCase().match(/[A-Z0-9]+/g) || [];
        if (words.length === 1) return words[0].slice(0, 3);
        return words.map(word => word[0]).join('').slice(0, 10) || 'SCH';
    };

    const [config, setConfig] = useState({
        schoolName: '',
        studentIdPrefix: 'PPS',
        motto: '',
        address: '',
        phone: '',
        email: '',
        logoUrl: '',
        academicYear: '2025/2026',
        currentTerm: 'Term 1',
        headMasterName: '',
        headMasterRemark: '',
        teacherRemark: '',
        nextTermBegins: '',
        nextTermFees: 0,
        canteenFeeAmount: 0,
        canteenFeeFrequency: 'TERMLY',
        headTeacherSign: '',
        schoolStamp: '',
        formMasters: [],
        staffRemarks: [],
        reportSmsTemplate: "Dear Parent, {name}'s report for {term} is ready. Score: {score}, Pos: {position}/{total}."
    });
    
    const [teachers, setTeachers] = useState([]);
    const [activeMasterIndex, setActiveMasterIndex] = useState(0);
    const [activeRemarkIndex, setActiveRemarkIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [studentIdPrefixAuto, setStudentIdPrefixAuto] = useState(true);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetConfirmation, setResetConfirmation] = useState('');
    const [resetting, setResetting] = useState(false);

    const goldColor = 'var(--theme-accent, #1d4ed8)';
    const blackColor = '#1a1a1a';

    useEffect(() => {
        fetchSettings();
        fetchTeachers();
        document.title = "EduManager | Settings";
    }, []);

    const fetchTeachers = async () => {
        try {
            const res = await API.get('/teachers');
            setTeachers(res.data || []);
        } catch (err) {
            console.error("Error loading teachers:", err);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await API.get('/settings');
            if (res.data) {
                const masters = res.data.formMasters && res.data.formMasters.length > 0 
                    ? res.data.formMasters 
                    : [{ name: '', signature: '' }];
                
                const remarks = res.data.staffRemarks && res.data.staffRemarks.length > 0
                    ? res.data.staffRemarks
                    : [{ staffName: '', remarks: '' }];

                setConfig({
                    ...res.data,
                    studentIdPrefix: res.data.studentIdPrefix || 'PPS',
                    formMasters: masters,
                    staffRemarks: remarks
                });
                setStudentIdPrefixAuto(
                    !res.data.schoolName
                    || !res.data.studentIdPrefix
                    || res.data.studentIdPrefix === deriveStudentIdPrefix(res.data.schoolName)
                );
            }
        } catch (err) {
            console.error("Error loading settings:", err);
        }
    };

    const handleFileUpload = (e, field, isFormMaster = false) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const isSchoolLogo = field === 'logoUrl' && !isFormMaster;
                const maxEdge = isSchoolLogo ? 256 : 500;
                const scaleSize = Math.min(1, maxEdge / Math.max(img.width, img.height));
                canvas.width = Math.max(1, Math.round(img.width * scaleSize));
                canvas.height = Math.max(1, Math.round(img.height * scaleSize));
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedBase64 = canvas.toDataURL('image/png');

                if (isFormMaster) {
                    setConfig(prev => {
                        const updatedMasters = [...prev.formMasters];
                        if (updatedMasters[activeMasterIndex]) {
                            updatedMasters[activeMasterIndex] = { 
                                ...updatedMasters[activeMasterIndex], 
                                signature: compressedBase64 
                            };
                        }
                        return { ...prev, formMasters: updatedMasters };
                    });
                } else {
                    setConfig(prev => ({ ...prev, [field]: compressedBase64 }));
                }
            };
        };
        reader.readAsDataURL(file);
    };

    const addFormMaster = () => {
        const newMasters = [...config.formMasters, { name: '', signature: '' }];
        setConfig(prev => ({ ...prev, formMasters: newMasters }));
        setActiveMasterIndex(newMasters.length - 1);
    };

    const removeFormMaster = (index) => {
        if (config.formMasters.length <= 1) return;
        const updated = config.formMasters.filter((_, i) => i !== index);
        setConfig(prev => ({ ...prev, formMasters: updated }));
        setActiveMasterIndex(0);
    };

    const addStaffRemark = () => {
        const newRemarks = [...config.staffRemarks, { staffName: '', remarks: '' }];
        setConfig(prev => ({ ...prev, staffRemarks: newRemarks }));
        setActiveRemarkIndex(newRemarks.length - 1);
    };

    const removeStaffRemark = (index) => {
        if (config.staffRemarks.length <= 1) return;
        const updated = config.staffRemarks.filter((_, i) => i !== index);
        setConfig(prev => ({ ...prev, staffRemarks: updated }));
        setActiveRemarkIndex(Math.max(0, activeRemarkIndex - 1));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            const response = await API.post('/settings', config);
            if (response.data) {
                setConfig(previous => ({ ...previous, ...response.data }));
                alert(`Settings saved. Termly fee: ₵${Number(response.data.nextTermFees || 0).toLocaleString()}. Canteen fee: GHS ${Number(response.data.canteenFeeAmount || 0).toLocaleString()} (${response.data.canteenFeeFrequency || 'TERMLY'}).`);
            } else {
                alert("Settings saved, but the server did not return the saved values. Reload Settings to verify the term fee.");
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to save settings. Check your server connection and permissions.");
        } finally { setLoading(false); }
    };

    const handleResetSystem = async () => {
        if (resetConfirmation.trim().toUpperCase() !== 'RESET') return;

        setResetting(true);
        try {
            const response = await API.post('/settings/reset-system', { confirmation: 'RESET' });
            if (response.data?.settings) {
                setConfig(previous => ({
                    ...previous,
                    ...response.data.settings,
                    formMasters: response.data.settings.formMasters?.length ? response.data.settings.formMasters : [{ name: '', signature: '' }],
                    staffRemarks: response.data.settings.staffRemarks?.length ? response.data.settings.staffRemarks : [{ staffName: '', remarks: '' }]
                }));
            }
            setShowResetModal(false);
            setResetConfirmation('');
            alert(response.data?.message || 'System data reset successfully.');
        } catch (err) {
            alert(err.response?.data?.message || err.response?.data || 'Failed to reset system data.');
        } finally {
            setResetting(false);
        }
    };

    return (
        <div className="container-fluid py-4 text-start bg-light min-vh-100">
            <header className="mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h3 className="fw-bold" style={{ color: blackColor }}>General Settings</h3>
                    <p className="text-muted small">Update school identity, academic cycles, and report templates</p>
                </div>
                <div className="d-flex gap-2">
                    <button type="button" onClick={() => setShowResetModal(true)}
                            className="btn btn-outline-danger px-3 py-2 fw-bold shadow-sm" disabled={resetting}>
                        <RotateCcw size={18} className="me-2"/> Reset System
                    </button>
                    <button onClick={handleSave} className="btn px-4 py-2 fw-bold shadow-sm"
                            style={{ backgroundColor: blackColor, color: goldColor }} disabled={loading}>
                        {loading ? 'Saving...' : <><Save size={18} className="me-2"/> Save Changes</>}
                    </button>
                </div>
            </header>

            <form onSubmit={handleSave} className="row g-4">
                <div className="col-md-8">
                    {/* Section 1: School Identity */}
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4 border-top border-5" style={{ borderColor: goldColor }}>
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <Building2 size={20} style={{ color: goldColor }}/> School Identity
                        </h5>
                        
                        <div className="row mb-4 align-items-center">
                            <div className="col-auto">
                                <div className="border rounded-3 d-flex align-items-center justify-content-center bg-white shadow-sm p-2"
                                     style={{ width: '140px', height: '100px', overflow: 'hidden' }}>
                                    {config.logoUrl ? (
                                        <img src={config.logoUrl} alt="Logo" className="w-100 h-100"
                                             style={{ objectFit: 'contain' }} />
                                    ) : (
                                        <ImageIcon size={40} className="text-muted opacity-50" />
                                    )}
                                </div>
                            </div>
                            <div className="col">
                                <label className="small fw-bold mb-1 d-block">School Logo</label>
                                <input type="file" className="form-control form-control-sm border-0 bg-light" 
                                       style={{ maxWidth: '300px' }} accept="image/*"
                                       onChange={(e) => handleFileUpload(e, 'logoUrl')} />
                                <span className="text-muted" style={{fontSize: '11px'}}>Any logo shape works; it will be scaled without cropping.</span>
                            </div>
                        </div>

                        <div className="row g-3">
                            <div className="col-md-7">
                                <label className="small fw-bold mb-1">School Name</label>
                                <input type="text" className="form-control bg-light border-0"
                                       value={config.schoolName}
                                       onChange={e => {
                                           const schoolName = e.target.value;
                                           setConfig(current => ({
                                               ...current,
                                               schoolName,
                                               ...(studentIdPrefixAuto
                                                   ? { studentIdPrefix: deriveStudentIdPrefix(schoolName) }
                                                   : {})
                                           }));
                                       }} />
                            </div>
                            <div className="col-md-5">
                                <label className="small fw-bold mb-1">Motto</label>
                                <input type="text" className="form-control bg-light border-0" placeholder="Knowledge is Power"
                                       value={config.motto} onChange={e => setConfig({...config, motto: e.target.value})} />
                            </div>
                            <div className="col-md-5">
                                <label className="small fw-bold mb-1">Student ID Prefix</label>
                                <input
                                    type="text"
                                    className="form-control bg-light border-0 text-uppercase"
                                    value={config.studentIdPrefix}
                                    onChange={e => {
                                        setStudentIdPrefixAuto(false);
                                        setConfig(current => ({
                                            ...current,
                                            studentIdPrefix: e.target.value.toUpperCase()
                                        }));
                                    }}
                                    maxLength={10}
                                    pattern="[A-Za-z0-9]{1,10}"
                                    title="Use 1 to 10 letters or numbers."
                                    required
                                />
                                {!studentIdPrefixAuto && (
                                    <button
                                        type="button"
                                        className="btn btn-link btn-sm px-0"
                                        onClick={() => {
                                            setStudentIdPrefixAuto(true);
                                            setConfig(current => ({
                                                ...current,
                                                studentIdPrefix: deriveStudentIdPrefix(current.schoolName)
                                            }));
                                        }}
                                    >
                                        Use school name initials
                                    </button>
                                )}
                                <small className="text-muted d-block">
                                    {studentIdPrefixAuto
                                        ? 'Automatically generated from the school name. Edit this field to set a custom prefix.'
                                        : 'Custom prefix. Change the school name without changing this prefix, or edit the prefix directly.'}
                                    {' '}New IDs will look like {config.studentIdPrefix || 'SCH'}-0001. Existing student IDs will not change.
                                </small>
                            </div>
                            <div className="col-12">
                                <label className="small fw-bold mb-1 d-flex align-items-center gap-1">
                                    <MapPin size={14}/> Address
                                </label>
                                <input type="text" className="form-control bg-light border-0"
                                       value={config.address} onChange={e => setConfig({...config, address: e.target.value})} />
                            </div>
                            <div className="col-md-6">
                                <label className="small fw-bold mb-1">Phone Number</label>
                                <input type="text" className="form-control bg-light border-0"
                                       value={config.phone} onChange={e => setConfig({...config, phone: e.target.value})} />
                            </div>
                            <div className="col-md-6">
                                <label className="small fw-bold mb-1">Email Address</label>
                                <input type="email" className="form-control bg-light border-0"
                                       value={config.email} onChange={e => setConfig({...config, email: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Form Masters */}
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                                <UserCheck size={20} style={{ color: goldColor }}/> Form Masters
                            </h5>
                            <button type="button" className="btn btn-sm btn-outline-dark rounded-pill" onClick={addFormMaster}>
                                <Plus size={16} /> Add Master
                            </button>
                        </div>

                        <div className="row g-4">
                            <div className="col-md-6">
                                <label className="small fw-bold mb-1">Select Master Slot</label>
                                <div className="d-flex gap-2">
                                    <select className="form-select bg-light border-0" 
                                            value={activeMasterIndex} 
                                            onChange={e => setActiveMasterIndex(parseInt(e.target.value))}>
                                        {config.formMasters.map((m, i) => (
                                            <option key={i} value={i}>
                                                {m.name ? `Master: ${m.name}` : `Empty Slot ${i+1}`}
                                            </option>
                                        ))}
                                    </select>
                                    <button type="button" className="btn btn-light text-danger" onClick={() => removeFormMaster(activeMasterIndex)}>
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <label className="small fw-bold mb-1">Select Teacher (from Database)</label>
                                <select 
                                    className="form-select bg-light border-0"
                                    value={config.formMasters[activeMasterIndex]?.name || ''}
                                    onChange={e => {
                                        const selectedName = e.target.value;
                                        setConfig(prev => {
                                            const updated = [...prev.formMasters];
                                            if (updated[activeMasterIndex]) {
                                                updated[activeMasterIndex] = { ...updated[activeMasterIndex], name: selectedName };
                                            }
                                            return { ...prev, formMasters: updated };
                                        });
                                    }}
                                >
                                    <option value="">-- Choose Teacher --</option>
                                    {teachers.map((t) => (
                                        <option key={t.id} value={`${t.firstName} ${t.lastName}`}>
                                            {t.firstName} {t.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-12 mt-4">
                                <label className="small fw-bold mb-2 d-block">Master Signature / Picture</label>
                                <div className="border rounded-4 p-4 text-center bg-light" style={{ borderStyle: 'dashed' }}>
                                    {config.formMasters[activeMasterIndex]?.signature ? (
                                        <div className="mb-3">
                                             <img src={config.formMasters[activeMasterIndex].signature} alt="Sign" style={{ maxHeight: '100px', borderRadius: '8px' }} />
                                        </div>
                                    ) : <div className="py-3 text-muted small">No signature uploaded for this slot</div>}
                                    <input type="file" className="form-control form-control-sm mx-auto" style={{maxWidth: '280px'}} accept="image/*"
                                           onChange={(e) => handleFileUpload(e, null, true)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2.5: Staff Remarks */}
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                                <MessageSquare size={20} style={{ color: goldColor }}/> Staff Remarks
                            </h5>
                            <button type="button" className="btn btn-sm btn-outline-dark rounded-pill" onClick={addStaffRemark}>
                                <Plus size={16} /> Add Remark
                            </button>
                        </div>

                        <div className="row g-4">
                            <div className="col-md-6">
                                <label className="small fw-bold mb-1">Select Remark Slot</label>
                                <div className="d-flex gap-2">
                                    <select className="form-select bg-light border-0" 
                                            value={activeRemarkIndex} 
                                            onChange={e => setActiveRemarkIndex(parseInt(e.target.value))}>
                                        {config.staffRemarks.map((r, i) => (
                                            <option key={i} value={i}>
                                                {r.staffName ? `Remark: ${r.staffName}` : `Empty Slot ${i+1}`}
                                            </option>
                                        ))}
                                    </select>
                                    <button type="button" className="btn btn-light text-danger" onClick={() => removeStaffRemark(activeRemarkIndex)}>
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <label className="small fw-bold mb-1">Staff Name/Title</label>
                                <input 
                                    type="text"
                                    className="form-control bg-light border-0"
                                    placeholder="e.g., Sports Director, Chaplain, Music Teacher"
                                    value={config.staffRemarks[activeRemarkIndex]?.staffName || ''}
                                    onChange={e => {
                                        const newValue = e.target.value;
                                        setConfig(prev => {
                                            const updated = [...prev.staffRemarks];
                                            if (updated[activeRemarkIndex]) {
                                                updated[activeRemarkIndex] = { ...updated[activeRemarkIndex], staffName: newValue };
                                            }
                                            return { ...prev, staffRemarks: updated };
                                        });
                                    }}
                                />
                            </div>

                            <div className="col-12 mt-2">
                                <label className="small fw-bold mb-1">Remark Content</label>
                                <textarea 
                                    className="form-control bg-light border-0 small" 
                                    rows="3"
                                    placeholder="Enter the remark/comment for this staff member"
                                    value={config.staffRemarks[activeRemarkIndex]?.remarks || ''}
                                    onChange={e => {
                                        const newValue = e.target.value;
                                        setConfig(prev => {
                                            const updated = [...prev.staffRemarks];
                                            if (updated[activeRemarkIndex]) {
                                                updated[activeRemarkIndex] = { ...updated[activeRemarkIndex], remarks: newValue };
                                            }
                                            return { ...prev, staffRemarks: updated };
                                        });
                                    }}
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    {/* Section 3: Academic Cycle */}
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4 border-top border-5" style={{ borderColor: blackColor }}>
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <Calendar size={20} style={{ color: goldColor }}/> Academic Cycle
                        </h5>
                        <div className="mb-3">
                            <label className="small fw-bold mb-1">Academic Year</label>
                            <input type="text" className="form-control bg-light border-0" placeholder="2025/2026"
                                   value={config.academicYear} onChange={e => setConfig({...config, academicYear: e.target.value})} />
                        </div>
                        <div className="mb-1">
                            <label className="small fw-bold mb-1">Current Term</label>
                            <select className="form-select bg-light border-0"
                                    value={config.currentTerm} onChange={e => setConfig({...config, currentTerm: e.target.value})}>
                                <option value="Term 1">Term 1</option>
                                <option value="Term 2">Term 2</option>
                                <option value="Term 3">Term 3</option>
                            </select>
                        </div>
                    </div>

                    {/* Section 4: Global Auth */}
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <Signature size={20} style={{ color: goldColor }}/> Authentication
                        </h5>
                        <div className="mb-4">
                            <label className="small fw-bold mb-1">Headmaster Name</label>
                            <input type="text" className="form-control bg-light border-0 mb-3"
                                   value={config.headMasterName} onChange={e => setConfig({...config, headMasterName: e.target.value})} />
                            
                            <label className="small fw-bold mb-2 d-block">Headmaster Signature</label>
                            <div className="border rounded-3 p-3 text-center bg-light mb-3">
                                {config.headTeacherSign ? <img src={config.headTeacherSign} alt="Sign" style={{ maxHeight: '50px' }} /> : <span className="small text-muted">Empty</span>}
                            </div>
                            <input type="file" className="form-control form-control-sm" accept="image/*" onChange={(e) => handleFileUpload(e, 'headTeacherSign')} />
                        </div>
                        <div className="mb-2">
                            <label className="small fw-bold mb-2 d-block">Official School Stamp</label>
                            <div className="border rounded-3 p-3 text-center bg-light mb-3">
                                {config.schoolStamp ? <img src={config.schoolStamp} alt="Stamp" style={{ maxHeight: '50px' }} /> : <span className="small text-muted">Empty</span>}
                            </div>
                            <input type="file" className="form-control form-control-sm" accept="image/*" onChange={(e) => handleFileUpload(e, 'schoolStamp')} />
                        </div>
                    </div>

                    {/* Section 5: Report Notices */}
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <MessageSquare size={20} style={{ color: goldColor }}/> Report Notices
                        </h5>
                        <div className="mb-3">
                            <label className="small fw-bold mb-1">Headmaster Remark</label>
                            <textarea className="form-control bg-light border-0 small" rows="3"
                                      value={config.headMasterRemark || ''}
                                      onChange={e => setConfig({...config, headMasterRemark: e.target.value})}></textarea>
                        </div>
                        <div className="mb-3">
                            <label className="small fw-bold mb-1">Teacher Remark</label>
                            <textarea className="form-control bg-light border-0 small" rows="3"
                                      value={config.teacherRemark || ''}
                                      onChange={e => setConfig({...config, teacherRemark: e.target.value})}></textarea>
                        </div>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="small fw-bold mb-1">Next Term Begins</label>
                                <input type="date" className="form-control bg-light border-0"
                                       value={config.nextTermBegins || ''}
                                       onChange={e => setConfig({...config, nextTermBegins: e.target.value})} />
                            </div>
                            <div className="col-md-6">
                                <label className="small fw-bold mb-1">Termly Fees</label>
                                <input type="number" className="form-control bg-light border-0"
                                       value={config.nextTermFees ?? 0}
                                       onChange={e => setConfig({...config, nextTermFees: Number(e.target.value) || 0})} />
                            </div>
                        </div>
                    </div>

                    {/* Section 6: SMS Template */}
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <MessageSquare size={20} style={{ color: goldColor }}/> Canteen Fees
                        </h5>
                        <div className="mb-3">
                            <label className="small fw-bold mb-1">Canteen fee amount (GHS)</label>
                            <input type="number" min="0" step="0.01" className="form-control bg-light border-0"
                                   value={config.canteenFeeAmount ?? 0}
                                   onChange={e => setConfig({ ...config, canteenFeeAmount: Number(e.target.value) || 0 })} />
                        </div>
                        <div>
                            <label className="small fw-bold mb-1">Billing frequency</label>
                            <select className="form-select bg-light border-0"
                                    value={config.canteenFeeFrequency || 'TERMLY'}
                                    onChange={e => setConfig({ ...config, canteenFeeFrequency: e.target.value })}>
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="TERMLY">Termly</option>
                            </select>
                        </div>
                    </div>

                    {/* Section 7: SMS Template */}
                    <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <MessageSquare size={20} style={{ color: goldColor }}/> Report SMS
                        </h5>
                        <label className="small fw-bold mb-1">Message Template</label>
                        <textarea className="form-control bg-light border-0 small" rows="4"
                                  value={config.reportSmsTemplate} 
                                  onChange={e => setConfig({...config, reportSmsTemplate: e.target.value})}></textarea>
                        <div className="mt-2 p-2 rounded bg-light border border-warning" style={{fontSize: '10px'}}>
                            <strong>Placeholders:</strong> {'{name}'}, {'{term}'}, {'{score}'}, {'{position}'}, {'{total}'}
                        </div>
                    </div>
                </div>
            </form>

            {showResetModal && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center px-3"
                     style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1055 }}>
                    <div className="card border-0 shadow-lg rounded-4" style={{ maxWidth: '520px', width: '100%' }}>
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start gap-3 mb-3">
                                <div className="rounded-circle bg-danger-subtle text-danger p-3">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h5 className="fw-bold text-danger mb-1">Reset the entire system?</h5>
                                    <p className="text-muted small mb-0">
                                        This permanently deletes students, staff records, attendance, fees, exams, payroll,
                                        expenses, classes, lessons, and other operational data. School settings will be restored
                                        to defaults. Administrator accounts and subscription status will be preserved.
                                    </p>
                                </div>
                            </div>

                            <label className="small fw-bold mb-2">Type <span className="text-danger">RESET</span> to confirm</label>
                            <input
                                type="text"
                                className="form-control mb-3"
                                value={resetConfirmation}
                                onChange={event => setResetConfirmation(event.target.value)}
                                placeholder="RESET"
                                autoComplete="off"
                            />

                            <div className="d-flex justify-content-end gap-2">
                                <button type="button" className="btn btn-light" disabled={resetting}
                                        onClick={() => {
                                            setShowResetModal(false);
                                            setResetConfirmation('');
                                        }}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-danger fw-bold"
                                        disabled={resetting || resetConfirmation.trim().toUpperCase() !== 'RESET'}
                                        onClick={handleResetSystem}>
                                    {resetting ? 'Resetting...' : 'Permanently Reset System'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;