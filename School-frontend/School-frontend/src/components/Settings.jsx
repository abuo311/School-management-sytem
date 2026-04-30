import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Save, Building2, UserCheck, Signature, Plus, Trash2, Image as ImageIcon, Calendar, MessageSquare, MapPin } from 'lucide-react';

const Settings = () => {
    const [config, setConfig] = useState({
        schoolName: '',
        motto: '',
        address: '',
        phone: '',
        email: '',
        logoUrl: '',
        academicYear: '2025/2026',
        currentTerm: 'Term 1',
        headMasterName: '',
        headTeacherSign: '',
        schoolStamp: '',
        formMasters: [], 
        reportSmsTemplate: "Dear Parent, {name}'s report for {term} is ready. Score: {score}, Pos: {position}/{total}."
    });
    
    const [teachers, setTeachers] = useState([]);
    const [activeMasterIndex, setActiveMasterIndex] = useState(0);
    const [loading, setLoading] = useState(false);

    const goldColor = '#d4af37';
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

                setConfig({
                    ...res.data,
                    formMasters: masters
                });
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
                const MAX_WIDTH = 500; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
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

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            await API.post('/settings', config);
            alert("Settings saved successfully!");
            fetchSettings();
        } catch (err) {
            alert("Failed to save. Check server connection.");
        } finally { setLoading(false); }
    };

    return (
        <div className="container-fluid py-4 text-start bg-light min-vh-100">
            <header className="mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h3 className="fw-bold" style={{ color: blackColor }}>General Settings</h3>
                    <p className="text-muted small">Update school identity, academic cycles, and report templates</p>
                </div>
                <button onClick={handleSave} className="btn px-4 py-2 fw-bold shadow-sm"
                        style={{ backgroundColor: blackColor, color: goldColor }} disabled={loading}>
                    {loading ? 'Saving...' : <><Save size={18} className="me-2"/> Save Changes</>}
                </button>
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
                                <div className="border rounded-circle d-flex align-items-center justify-content-center bg-light shadow-sm" 
                                     style={{ width: '100px', height: '100px', overflow: 'hidden' }}>
                                    {config.logoUrl ? (
                                        <img src={config.logoUrl} alt="Logo" className="w-100 h-100 object-fit-cover" />
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
                                <span className="text-muted" style={{fontSize: '11px'}}>Best: Square PNG with transparent background</span>
                            </div>
                        </div>

                        <div className="row g-3">
                            <div className="col-md-7">
                                <label className="small fw-bold mb-1">School Name</label>
                                <input type="text" className="form-control bg-light border-0"
                                       value={config.schoolName} onChange={e => setConfig({...config, schoolName: e.target.value})} />
                            </div>
                            <div className="col-md-5">
                                <label className="small fw-bold mb-1">Motto</label>
                                <input type="text" className="form-control bg-light border-0" placeholder="Knowledge is Power"
                                       value={config.motto} onChange={e => setConfig({...config, motto: e.target.value})} />
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

                    {/* Section 5: SMS Template */}
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
        </div>
    );
};

export default Settings;