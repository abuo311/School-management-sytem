import React, { useState, useEffect } from 'react';
import * as bootstrap from 'bootstrap'; 
import API from '../services/api';
import {
    Printer, Search, MessageCircle, Edit, Save, 
    RefreshCw, CheckCircle2, Clock, CheckSquare, Square, Send, 
    Loader2, School, X, Phone, MessageSquare
} from 'lucide-react';

const DebtorsList = () => {
    const [debtors, setDebtors] = useState([]);
    const [schoolSettings, setSchoolSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nameSearch, setNameSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [contactedIds, setContactedIds] = useState([]);
    
    // Edit Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [newContact, setNewContact] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const goldColor = '#d4af37';
    const blackColor = '#1a1a1a';

    useEffect(() => { 
        fetchData();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await API.get('/settings');
            setSchoolSettings(res.data);
        } catch (err) {
            console.error("Settings Fetch Error:", err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await API.get('/fees/debtors');
            setDebtors(res.data || []);
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateContact = async () => {
        if (!editingStudent) return;
        setIsUpdating(true);
        try {
            const payload = { ...editingStudent, parentContact: newContact, enabled: true };
            await API.put(`/students/${editingStudent.id}`, payload);
            await fetchData(); 
            setIsEditModalOpen(false);
        } catch (err) {
            alert("Update failed.");
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredDebtors.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredDebtors.map(item => item.student?.id).filter(id => id));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const getMessage = (name, balance) => 
        `Dear Parent, this is a reminder from ${schoolSettings?.schoolName || 'the School'} regarding ${name}'s outstanding fees of ₵${balance.toLocaleString()}.`;

    // --- NEW BULK LOGIC ---
    const sendBulkWhatsApp = () => {
        if (selectedIds.length === 0) return alert("Please select students first.");
        
        const selectedDebtors = debtors.filter(d => selectedIds.includes(d.student?.id));
        
        selectedDebtors.forEach((item, index) => {
            const student = item.student;
            if (student?.parentContact) {
                // We use a timeout to prevent browsers from blocking multiple popups
                setTimeout(() => {
                    const phone = student.parentContact.replace(/\s/g, '');
                    const text = encodeURIComponent(getMessage(`${student.firstName} ${student.lastName}`, item.balance));
                    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
                    setContactedIds(prev => [...new Set([...prev, student.id])]);
                }, index * 1000); 
            }
        });
    };

    const sendBulkSMS = () => {
        if (selectedIds.length === 0) return alert("Please select students first.");
        
        const selectedDebtors = debtors.filter(d => selectedIds.includes(d.student?.id));
        
        // Mobile devices usually only handle one sms: intent at a time. 
        // For true bulk SMS, you would typically use an API like Twilio.
        // This helper will trigger them sequentially.
        selectedDebtors.forEach((item, index) => {
            const student = item.student;
            if (student?.parentContact) {
                setTimeout(() => {
                    const phone = student.parentContact.replace(/\s/g, '');
                    const text = getMessage(`${student.firstName} ${student.lastName}`, item.balance);
                    window.location.href = `sms:${phone}?body=${encodeURIComponent(text)}`;
                    setContactedIds(prev => [...new Set([...prev, student.id])]);
                }, index * 1500);
            }
        });
    };

    const sendWhatsApp = (item) => {
        const student = item.student;
        if (!student?.parentContact) return alert("No contact found!");
        const phone = student.parentContact.replace(/\s/g, '');
        const text = encodeURIComponent(getMessage(`${student.firstName} ${student.lastName}`, item.balance));
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
        setContactedIds(prev => [...new Set([...prev, student.id])]);
    };

    const sendSMS = (item) => {
        const student = item.student;
        if (!student?.parentContact) return alert("No contact found!");
        const phone = student.parentContact.replace(/\s/g, '');
        const text = getMessage(`${student.firstName} ${student.lastName}`, item.balance);
        window.location.href = `sms:${phone}?body=${encodeURIComponent(text)}`;
        setContactedIds(prev => [...new Set([...prev, student.id])]);
    };

    const filteredDebtors = (debtors || []).filter(item => {
        const fullName = `${item.student?.firstName || ''} ${item.student?.lastName || ''}`.toLowerCase();
        return fullName.includes(nameSearch.toLowerCase());
    });

    return (
        <div className="container-fluid py-4 bg-light min-vh-100 text-start">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-section, #print-section * { visibility: visible; }
                    #print-section { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    .print-table { width: 100% !important; border: 1px solid #000 !important; }
                    .print-table th { background-color: #f0f0f0 !important; color: black !important; border: 1px solid #000 !important; }
                    .print-table td { border: 1px solid #000 !important; }
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .border-gold { border-color: ${goldColor} !important; }
                .bg-black { background-color: ${blackColor} !important; }
                .text-gold { color: ${goldColor} !important; }
                .cursor-pointer { cursor: pointer; }
            `}</style>

            <div id="print-section" className="mx-auto" style={{maxWidth: '1100px'}}>
                
                <div className="bg-black text-white p-4 text-center border-bottom border-gold border-5 rounded-top-4">
                    <div className="d-flex align-items-center justify-content-center gap-4">
                        {schoolSettings?.logoUrl && <img src={schoolSettings.logoUrl} alt="Logo" style={{ height: '70px' }} />}
                        <div className="text-start">
                            <h2 className="fw-black text-uppercase m-0" style={{color: goldColor}}>
                                {schoolSettings?.schoolName || 'ACADEMIC INSTITUTION'}
                            </h2>
                            <p className="mb-0 small fw-bold text-white-50">{schoolSettings?.motto || 'Excellence in Education'}</p>
                            <p className="small mb-0 text-white-50">{schoolSettings?.address} | {schoolSettings?.phone}</p>
                        </div>
                    </div>
                </div>

                <div className="card border-0 shadow-sm p-4 mb-4 no-print rounded-0 rounded-bottom-4">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-4">
                            <div className="position-relative">
                                <Search className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={18} />
                                <input 
                                    type="text" 
                                    className="form-control rounded-pill ps-5 bg-light border-0 shadow-sm" 
                                    placeholder="Search debtors..." 
                                    onChange={(e) => setNameSearch(e.target.value)} 
                                />
                            </div>
                        </div>
                        <div className="col-md-8 d-flex gap-2 justify-content-md-end flex-wrap">
                            {selectedIds.length > 0 && (
                                <>
                                    <button className="btn btn-success fw-bold px-3 d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={sendBulkWhatsApp}>
                                        <MessageCircle size={18}/> Bulk WhatsApp ({selectedIds.length})
                                    </button>
                                    <button className="btn btn-primary fw-bold px-3 d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={sendBulkSMS}>
                                        <Send size={18}/> Bulk SMS ({selectedIds.length})
                                    </button>
                                </>
                            )}
                            <button className="btn btn-dark fw-bold px-4 d-flex align-items-center gap-2 rounded-pill shadow-sm" onClick={() => window.print()}>
                                <Printer size={18} className="text-gold"/> Print Report
                            </button>
                        </div>
                    </div>
                </div>

                <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                    <div className="p-3 bg-white border-bottom d-flex justify-content-between align-items-center">
                        <div>
                            <h5 className="mb-0 fw-bold text-uppercase d-inline-block me-3" style={{fontSize: '14px', letterSpacing: '1px'}}>Financial Delinquency List</h5>
                            {selectedIds.length > 0 && <span className="text-primary small fw-bold">{selectedIds.length} selected</span>}
                        </div>
                        <span className="badge bg-danger px-3">Date: {new Date().toLocaleDateString()}</span>
                    </div>
                    <table className="table table-hover align-middle mb-0 print-table">
                        <thead className="bg-black text-white">
                            <tr className="small text-uppercase">
                                <th className="px-4 d-print-none" style={{width: '50px'}}>
                                    <div onClick={toggleSelectAll} className="cursor-pointer">
                                        {selectedIds.length === filteredDebtors.length && filteredDebtors.length > 0 ? <CheckSquare size={18} className="text-gold" /> : <Square size={18} />}
                                    </div>
                                </th>
                                <th>Student Details</th>
                                <th>Class</th>
                                <th className="text-end">Outstanding Balance</th>
                                <th className="text-center d-print-none">Reminder</th>
                                <th className="text-center d-print-none">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-5"><Loader2 className="animate-spin mx-auto" style={{ color: goldColor }} /></td></tr>
                            ) : filteredDebtors.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-5 text-muted">No debtors found matching your search.</td></tr>
                            ) : filteredDebtors.map((item, i) => (
                                <tr key={item.student?.id || i}>
                                    <td className="px-4 d-print-none">
                                        <div onClick={() => toggleSelectOne(item.student?.id)} className="cursor-pointer">
                                            {selectedIds.includes(item.student?.id) ? <CheckSquare size={18} className="text-gold" /> : <Square size={18} className="text-muted" />}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="fw-bold text-uppercase">{item.student?.firstName} {item.student?.lastName}</div>
                                        <div className="text-muted extra-small">ID: {item.student?.admissionNumber} | <Phone size={10}/> {item.student?.parentContact || 'No Contact'}</div>
                                    </td>
                                    <td><span className="badge bg-light text-dark border">{item.student?.gradeLevel}</span></td>
                                    <td className="text-end fw-black text-danger">₵{item.balance?.toLocaleString()}</td>
                                    <td className="text-center d-print-none">
                                        {contactedIds.includes(item.student?.id) ? (
                                            <span className="badge bg-success-subtle text-success border border-success px-3 rounded-pill">Sent</span>
                                        ) : (
                                            <span className="badge bg-warning-subtle text-warning border border-warning px-3 rounded-pill">Pending</span>
                                        )}
                                    </td>
                                    <td className="text-center d-print-none">
                                        <div className="btn-group border rounded-pill overflow-hidden shadow-sm bg-white">
                                            <button className="btn btn-sm px-3 text-success border-end" onClick={() => sendWhatsApp(item)} title="WhatsApp"><MessageCircle size={16}/></button>
                                            <button className="btn btn-sm px-3 text-primary border-end" onClick={() => sendSMS(item)} title="SMS"><Send size={16}/></button>
                                            <button className="btn btn-sm px-3 text-dark" onClick={() => {
                                                setEditingStudent(item.student);
                                                setNewContact(item.student?.parentContact || '');
                                                setIsEditModalOpen(true);
                                            }}><Edit size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="d-none d-print-block mt-5">
                    <div className="row text-center align-items-end">
                        <div className="col-6">
                            <div className="border-top border-dark mx-5 pt-2">
                                <p className="small mb-0 fw-bold text-uppercase">Accountant Signature</p>
                                <div style={{height: '40px'}}></div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="border-top border-dark mx-5 pt-2">
                                <p className="small mb-0 fw-bold text-uppercase">Headmaster's Stamp</p>
                                <div style={{height: '40px'}}></div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-black py-2 text-center mt-5 border-top border-gold border-3 rounded-bottom-3">
                        <small className="text-warning-50 fw-bold" style={{fontSize: '10px', letterSpacing: '2px'}}>OFFICIAL FINANCIAL DOCUMENT</small>
                    </div>
                </div>
            </div>

            {/* --- EDIT MODAL --- */}
            {isEditModalOpen && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="bg-black p-3 d-flex justify-content-between align-items-center">
                                <h6 className="text-white m-0 fw-bold"><Edit size={16} className="text-gold me-2"/> Update Contact</h6>
                                <X className="text-white cursor-pointer" size={20} onClick={() => setIsEditModalOpen(false)} />
                            </div>
                            <div className="modal-body p-4">
                                <p className="text-muted small mb-4">Editing parent contact for: <br/><strong className="text-dark h5">{editingStudent?.firstName} {editingStudent?.lastName}</strong></p>
                                <div className="form-group">
                                    <label className="form-label small fw-bold">New Phone Number</label>
                                    <input 
                                        type="text" 
                                        className="form-control form-control-lg bg-light border-0 rounded-3" 
                                        value={newContact} 
                                        onChange={(e) => setNewContact(e.target.value)}
                                        placeholder="Enter contact number"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer border-0 p-3 bg-light">
                                <button className="btn btn-link text-dark fw-bold text-decoration-none px-4" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                <button className="btn btn-dark rounded-pill px-4 shadow-sm" onClick={handleUpdateContact} disabled={isUpdating}>
                                    {isUpdating ? <Loader2 size={16} className="animate-spin me-2"/> : <Save className="me-2 text-gold" size={16}/>}
                                    Save Updates
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebtorsList;