import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Loader2, Printer } from 'lucide-react';
import API from '../services/api';

const STATUS_COLUMNS = [
    { key: 'PRESENT', label: 'Present' },
    { key: 'ABSENT', label: 'Absent' },
    { key: 'LATE', label: 'Late' },
    { key: 'EXITED', label: 'Exited' },
    { key: 'OTHER', label: 'Other' }
];

const getStatusCategory = status => {
    const normalizedStatus = status?.trim().toUpperCase();
    if (normalizedStatus === 'STOPPED_SCHOOLING') return 'EXITED';
    return STATUS_COLUMNS.some(column => column.key === normalizedStatus) ? normalizedStatus : 'OTHER';
};

const getClassName = record => record.student?.gradeLevel || record.student?.className || 'Unassigned';
const getToday = () => new Date().toISOString().split('T')[0];

const AttendanceSummary = () => {
    const [searchParams] = useSearchParams();
    const queryDate = searchParams.get('date');
    const selectedClass = searchParams.get('class');
    const selectedStatus = searchParams.get('status');
    const isDetailView = Boolean(queryDate && selectedClass && selectedStatus);
    const [selectedDate, setSelectedDate] = useState(queryDate || getToday());
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const date = queryDate || selectedDate;

    useEffect(() => {
        let isCurrentRequest = true;

        const fetchAttendance = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await API.get(`/attendance/date/${date}`);
                if (isCurrentRequest) setRecords(response.data || []);
            } catch (requestError) {
                console.error('Attendance summary load error:', requestError);
                if (isCurrentRequest) setError('Unable to load attendance for this date. Please try again.');
            } finally {
                if (isCurrentRequest) setLoading(false);
            }
        };

        fetchAttendance();
        return () => {
            isCurrentRequest = false;
        };
    }, [date]);

    const classStats = Object.values(records.reduce((classes, record) => {
        const className = getClassName(record);
        if (!classes[className]) {
            classes[className] = {
                name: className,
                counts: Object.fromEntries(STATUS_COLUMNS.map(column => [column.key, 0]))
            };
        }
        classes[className].counts[getStatusCategory(record.status)] += 1;
        return classes;
    }, {})).sort((first, second) => first.name.localeCompare(second.name));

    const detailRecords = records
        .filter(record => getClassName(record) === selectedClass
            && getStatusCategory(record.status) === selectedStatus)
        .sort((first, second) => {
            const firstName = `${first.student?.firstName || ''} ${first.student?.lastName || ''}`;
            const secondName = `${second.student?.firstName || ''} ${second.student?.lastName || ''}`;
            return firstName.localeCompare(secondName);
        });

    const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    if (isDetailView) {
        const statusLabel = STATUS_COLUMNS.find(column => column.key === selectedStatus)?.label || selectedStatus;

        return (
            <section className="attendance-summary-print card border-0 shadow-sm rounded-4 p-4 bg-white">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <Link to="/dashboard" className="btn btn-link p-0 mb-2 no-print">
                            <ArrowLeft size={16} className="me-1" />Back to dashboard
                        </Link>
                        <h2 className="h4 fw-bold mb-1">{selectedClass} - {statusLabel} attendance</h2>
                        <p className="text-muted mb-0">{formattedDate} · {detailRecords.length} student{detailRecords.length === 1 ? '' : 's'}</p>
                    </div>
                    <button type="button" className="btn btn-primary no-print" onClick={() => window.print()}>
                        <Printer size={16} className="me-2" />Print list
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-5"><Loader2 className="animate-spin text-primary" size={28} /></div>
                ) : error ? (
                    <div className="alert alert-danger mb-0" role="alert">{error}</div>
                ) : detailRecords.length === 0 ? (
                    <p className="text-muted text-center py-4 mb-0">No attendance records match this selection.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th scope="col">#</th>
                                    <th scope="col">Student name</th>
                                    <th scope="col">Admission number</th>
                                    <th scope="col">Class</th>
                                    <th scope="col">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailRecords.map((record, index) => (
                                    <tr key={record.id}>
                                        <td>{index + 1}</td>
                                        <td>{record.student
                                            ? `${record.student.firstName || ''} ${record.student.lastName || ''}`.trim()
                                            : 'Unknown student'}</td>
                                        <td>{record.student?.admissionNumber || '-'}</td>
                                        <td>{getClassName(record)}</td>
                                        <td>{record.status?.trim().toUpperCase() === 'STOPPED_SCHOOLING'
                                            ? 'Exited (stopped schooling)'
                                            : record.status || 'Unknown'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        );
    }

    return (
        <section className="attendance-summary-print card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                    <h2 className="h5 fw-bold mb-1"><CalendarDays size={19} className="text-primary me-2" />Daily attendance</h2>
                    <p className="text-muted small mb-0">Select a status count to view and print that class list.</p>
                </div>
                <label className="d-flex align-items-center gap-2 small fw-semibold">
                    Attendance date
                    <input
                        type="date"
                        className="form-control form-control-sm"
                        value={selectedDate}
                        onChange={event => setSelectedDate(event.target.value)}
                    />
                </label>
            </div>

            {loading ? (
                <div className="text-center py-5"><Loader2 className="animate-spin text-primary" size={28} /></div>
            ) : error ? (
                <div className="alert alert-danger mb-0" role="alert">{error}</div>
            ) : classStats.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">No attendance records found for {formattedDate}.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th scope="col">Class</th>
                                {STATUS_COLUMNS.map(column => <th scope="col" className="text-center" key={column.key}>{column.label}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {classStats.map(classStat => (
                                <tr key={classStat.name}>
                                    <th scope="row">{classStat.name}</th>
                                    {STATUS_COLUMNS.map(column => (
                                        <td className="text-center" key={column.key}>
                                            <Link
                                                className="fw-semibold"
                                                aria-label={`View ${classStat.counts[column.key]} ${column.label.toLowerCase()} attendance records for ${classStat.name}`}
                                                to={`/dashboard/attendance-summary?${new URLSearchParams({
                                                    date,
                                                    class: classStat.name,
                                                    status: column.key
                                                }).toString()}`}
                                            >
                                                {classStat.counts[column.key]}
                                            </Link>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

export default AttendanceSummary;
