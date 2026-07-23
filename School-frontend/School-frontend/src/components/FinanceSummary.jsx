import React, { useState, useEffect } from 'react';
import API from '../services/api';
import {
    PieChart as PieIcon, DollarSign, TrendingUp, Printer,
    Calendar, ArrowUpRight, ArrowDownRight, Loader2, CheckCircle
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Legend, Line
} from 'recharts';

const FinanceSummary = () => {
    const [stats, setStats] = useState({
        expected: 0, collected: 0, debt: 0, todayCollection: 0, yesterdayCollection: 0
    });
    const [trendData, setTrendData] = useState([]); // State for the chart
    const [loading, setLoading] = useState(true);
    const [schoolConfig, setSchoolConfig] = useState({
        schoolName: "EduManager School",
        address: "Main Campus, City"
    });
    const [selectedTerm, setSelectedTerm] = useState("");

    const colors = {
        gold: '#D4AF37',
        darkGold: '#AA8A2E',
        charcoal: '#1A1A1A',
        richBlack: '#0D0D0D',
        danger: '#dc3545'
    };

    useEffect(() => {
        fetchSummary();
        fetchSchoolSettings();
    }, [selectedTerm]);

    const fetchSchoolSettings = async () => {
        try {
            const res = await API.get('/settings');
            if (res.data) setSchoolConfig(prev => ({ ...prev, ...res.data }));
        } catch (err) { console.error("Settings Error:", err); }
    };

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const res = await API.get(`/fees/summary?term=${selectedTerm}`);
            setStats(res.data);
            
            // Assuming your backend can return trend data or we mock it for the visual:
            // Replace this with actual API call if available: API.get('/fees/trends')
            const mockTrend = [
                { name: 'Week 1', collected: 4000, debt: 2400 },
                { name: 'Week 2', collected: 3000, debt: 1398 },
                { name: 'Week 3', collected: 2000, debt: 9800 },
                { name: 'Week 4', collected: 2780, debt: 3908 },
                { name: 'Week 5', collected: 1890, debt: 4800 },
                { name: 'Week 6', collected: 2390, debt: 3800 },
            ];
            setTrendData(res.data.trends || mockTrend);
        } catch (err) {
            console.error("Finance Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const collectionRate = stats.expected > 0 ? ((stats.collected / stats.expected) * 100).toFixed(1) : 0;
    const growth = stats.todayCollection - stats.yesterdayCollection;

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100 bg-white">
            <Loader2 className="animate-spin text-warning" size={48} />
        </div>
    );

    return (
        <div className="container-fluid py-4 text-start bg-white min-vh-100">
            <style>{`
                @media print {
                    @page { margin: 1.5cm; }
                    body * { visibility: hidden !important; }
                    .professional-audit-report, .professional-audit-report * { visibility: visible !important; }
                    .professional-audit-report { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
                .gold-gradient { background: linear-gradient(135deg, ${colors.gold} 0%, ${colors.darkGold} 100%); }
                .black-gradient { background: linear-gradient(135deg, ${colors.charcoal} 0%, ${colors.richBlack} 100%); }
                .currency-display { font-size: clamp(1.5rem, 4vw, 2.5rem); word-break: break-all; }
                .card { transition: transform 0.2s; border: none !important; }
                .card:hover { transform: translateY(-3px); }
            `}</style>

            {/* --- HEADER --- */}
            <header className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 no-print gap-4">
                <div>
                    <h3 className="fw-bold text-dark mb-0 d-flex align-items-center">
                        <Calendar className="me-2" color={colors.gold} size={28}/>
                        Revenue Analytics
                    </h3>
                    <p className="text-muted small mb-0">{schoolConfig.schoolName} Financial Position</p>
                </div>

                <div className="d-flex flex-wrap gap-2">
                    <select
                        className="form-select rounded-pill border shadow-sm px-4 fw-bold"
                        style={{ minWidth: '200px', height: '45px', borderColor: colors.gold }}
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                    >
                        <option value="">All Terms</option>
                        <option value="Term 1">Term 1</option>
                        <option value="Term 2">Term 2</option>
                        <option value="Term 3">Term 3</option>
                    </select>
                    <button className="btn btn-dark rounded-pill px-4 d-flex align-items-center gap-2" onClick={() => window.print()}>
                        <Printer size={18} color={colors.gold}/> <span style={{color: colors.gold}}>Export</span>
                    </button>
                </div>
            </header>

            {/* --- SUMMARY CARDS --- */}
            <div className="row g-4 mb-5 no-print">
                <div className="col-12 col-sm-6 col-xl-4">
                    <div className="card shadow-lg rounded-4 p-4 black-gradient text-white h-100 border-top border-warning border-4">
                        <label className="small fw-bold opacity-50 text-uppercase">Total Projected</label>
                        <h2 className="fw-bold mb-0 currency-display" style={{color: colors.gold}}>₵{stats.expected.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-4">
                    <div className="card shadow-lg rounded-4 p-4 gold-gradient text-white h-100">
                        <label className="small fw-bold opacity-75 text-uppercase">Actual Collection</label>
                        <h2 className="fw-bold mb-0 currency-display">₵{stats.collected.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="col-12 col-xl-4">
                    <div className="card shadow-lg rounded-4 p-4 bg-white h-100 border-start border-danger border-4">
                        <label className="small fw-bold text-muted text-uppercase">Outstanding Debt</label>
                        <h2 className="fw-bold mb-0 currency-display text-danger">₵{stats.debt.toLocaleString()}</h2>
                    </div>
                </div>
            </div>

            {/* --- TREND CHART SECTION --- */}
            <div className="row g-4 no-print">
                <div className="col-lg-8">
                    <div className="card shadow-sm rounded-4 p-4 bg-white">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5 className="fw-bold text-dark mb-0">Collection Trend</h5>
                            <TrendingUp size={20} className="text-muted" />
                        </div>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorCol" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={colors.gold} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={colors.gold} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)'}}
                                    />
                                    <Legend verticalAlign="top" height={36}/>
                                    <Area 
                                        name="Collected" 
                                        type="monotone" 
                                        dataKey="collected" 
                                        stroke={colors.gold} 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorCol)" 
                                    />
                                    <Area 
                                        name="Debt" 
                                        type="monotone" 
                                        dataKey="debt" 
                                        stroke={colors.danger} 
                                        strokeWidth={2}
                                        fill="transparent"
                                        strokeDasharray="5 5"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Efficiency Sidebar */}
                <div className="col-lg-4">
                    <div className="card shadow-sm rounded-4 p-4 bg-white h-100 border-bottom border-dark border-3">
                        <h6 className="fw-bold text-muted text-uppercase mb-4 small">Recovery Efficiency</h6>
                        <div className="text-center mb-4">
                            <h1 className="display-4 fw-bold" style={{color: colors.darkGold}}>{collectionRate}%</h1>
                            <p className="text-muted">Total Funds Secured</p>
                        </div>
                        <div className="progress rounded-pill mb-4" style={{height: '12px', backgroundColor: '#f0f0f0'}}>
                            <div className="progress-bar gold-gradient" style={{width: `${collectionRate}%`}}></div>
                        </div>
                        <div className="d-flex justify-content-between border-top pt-3 mt-3">
                            <div className="text-center w-50 border-end">
                                <span className="d-block small text-muted">Intake Growth</span>
                                <span className={`fw-bold ${growth >= 0 ? 'text-success' : 'text-danger'}`}>
                                    {growth >= 0 ? '+' : ''}{growth.toLocaleString()}
                                </span>
                            </div>
                            <div className="text-center w-50">
                                <span className="d-block small text-muted">Risk Level</span>
                                <span className="fw-bold text-dark">{collectionRate > 80 ? 'Low' : 'Moderate'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PRINT SECTION (Remains standard for audit) --- */}
            <div className="professional-audit-report d-none d-print-block">
                <h2 className="text-center fw-bold">{schoolConfig.schoolName} - Audit Report</h2>
                <hr />
                <table className="table table-bordered mt-4">
                    <thead><tr className="table-dark"><th>Metric</th><th>Value (₵)</th></tr></thead>
                    <tbody>
                        <tr><td>Projected Revenue</td><td>{stats.expected.toLocaleString()}</td></tr>
                        <tr><td>Actual Collected</td><td>{stats.collected.toLocaleString()}</td></tr>
                        <tr><td>Total Arrears</td><td>{stats.debt.toLocaleString()}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinanceSummary;