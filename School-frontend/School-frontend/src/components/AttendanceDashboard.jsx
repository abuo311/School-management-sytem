import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';
import API from '../services/api';

const AttendanceDashboard = () => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWeeklyStats = async () => {
            try {
                // Hits the new @GetMapping base endpoint we added to the controller
                const res = await API.get('/attendance');
                const data = res.data || [];
                const classStats = {};

                data.forEach(record => {
                    // Safe access using optional chaining to prevent crashes if student is null
                    const className = record.student?.gradeLevel || 'Unassigned';

                    if (!classStats[className]) {
                        classStats[className] = { name: className, present: 0, total: 0 };
                    }

                    classStats[className].total += 1;

                    // Case-insensitive status check to ensure 'Present' or 'present' both work
                    if (record.status?.toUpperCase() === 'PRESENT') {
                        classStats[className].present += 1;
                    }
                });

                const formatted = Object.values(classStats).map(item => ({
                    name: item.name,
                    percentage: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
                    raw: `${item.present}/${item.total}`
                })).sort((a, b) => b.percentage - a.percentage);

                setChartData(formatted);
            } catch (err) {
                console.error("Chart error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchWeeklyStats();
    }, []);

    if (loading) return (
        <div className="card border-0 shadow-sm rounded-4 p-5 bg-white mb-4 d-flex align-items-center justify-content-center">
            <Loader2 className="animate-spin text-primary" size={30} />
        </div>
    );

    return (
        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
            <div className="d-flex justify-content-between align-items-center mb-4 text-start">
                <div>
                    <h5 className="fw-bold mb-1"><TrendingUp size={20} className="text-primary me-2"/>Attendance Ranking</h5>
                    <p className="text-muted small">Average attendance percentage by class</p>
                </div>
                <span className="badge bg-success-subtle text-success p-2 px-3 rounded-pill">Live Data</span>
            </div>

            {chartData.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} unit="%" />
                            <Tooltip
                                cursor={{ fill: '#f8f9fa' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="percentage" radius={[6, 6, 0, 0]} barSize={40}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={entry.percentage > 80 ? '#1cc88a' : entry.percentage > 50 ? '#4e73df' : '#e74a3b'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="text-center p-5 text-muted">
                    No attendance records found for this period.
                </div>
            )}

            <div className="row mt-4 g-2 text-start">
                <div className="col-6">
                    <div className="p-3 bg-light rounded-3 border-start border-success border-4">
                        <small className="text-muted d-block">Highest Turnout</small>
                        <span className="fw-bold text-dark">{chartData[0]?.name || 'N/A'}</span>
                    </div>
                </div>
                <div className="col-6">
                    <div className="p-3 bg-light rounded-3 border-start border-danger border-4">
                        <small className="text-muted d-block">Lowest Turnout</small>
                        <span className="fw-bold text-dark">{chartData.length > 0 ? chartData[chartData.length - 1].name : 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceDashboard;