import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiDownload, FiFilter, FiCalendar } from 'react-icons/fi';
import { format } from 'date-fns';

const CoordinatorDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', date: '' });
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportBranch, setExportBranch] = useState('');

  const BRANCHES = ['', 'CS', 'IT', 'ECE', 'EE', 'ME', 'CE', 'CH'];

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date)   params.end_date   = filters.end_date;
      if (filters.date)       params.date        = filters.date;
      const res = await api.get('/oa', { params });
      setSessions(res.data.data);
    } catch {}
    setLoading(false);
  };

  const viewAttendance = async (session) => {
    setSelectedSession(session);
    try {
      const res = await api.get(`/attendance/oa/${session.id}`);
      setAttendance(res.data.data);
    } catch {}
  };

  const exportExcel = () => {
    if (!selectedSession) return;
    const params = new URLSearchParams();
    if (exportBranch) params.append('branch', exportBranch);
    const url = `${import.meta.env.VITE_API_URL}/attendance/export/${selectedSession.id}?${params}`;
    const token = localStorage.getItem('accessToken');
    // Use fetch to download with auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `OA_${selectedSession.title}_${Date.now()}.xlsx`;
        a.click();
        toast.success('Excel downloaded!');
      })
      .catch(() => toast.error('Export failed'));
  };

  const statusColors = { upcoming:'badge-info', active:'badge-success', extended:'badge-warning', closed:'badge-ghost' };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="text-lg font-bold flex items-center gap-2"><FiFilter /> Filter OA Sessions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="form-control">
                <label className="label text-xs font-semibold">Specific Date</label>
                <input type="date" className="input input-bordered input-sm" value={filters.date}
                  onChange={e => setFilters(p => ({ ...p, date: e.target.value, start_date: '', end_date: '' }))} />
              </div>
              <div className="form-control">
                <label className="label text-xs font-semibold">From Date</label>
                <input type="date" className="input input-bordered input-sm" value={filters.start_date}
                  onChange={e => setFilters(p => ({ ...p, start_date: e.target.value, date: '' }))} />
              </div>
              <div className="form-control">
                <label className="label text-xs font-semibold">To Date</label>
                <input type="date" className="input input-bordered input-sm" value={filters.end_date}
                  onChange={e => setFilters(p => ({ ...p, end_date: e.target.value, date: '' }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button className="btn btn-primary btn-sm" onClick={fetchSessions}>Apply Filter</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setFilters({ start_date:'', end_date:'', date:'' }); setTimeout(fetchSessions, 0); }}>Clear</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sessions List */}
          <div className="space-y-3">
            <h2 className="font-bold">OA Sessions ({sessions.length})</h2>
            {loading ? (
              <div className="flex justify-center py-8"><span className="loading loading-spinner loading-lg text-primary" /></div>
            ) : sessions.map(s => (
              <div key={s.id}
                className={`card shadow-sm cursor-pointer transition-all ${selectedSession?.id === s.id ? 'bg-primary text-primary-content ring-2 ring-primary' : 'bg-base-100 hover:shadow-md'}`}
                onClick={() => viewAttendance(s)}>
                <div className="card-body py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm">{s.title}</h3>
                      <p className={`text-xs mt-1 ${selectedSession?.id === s.id ? 'text-primary-content/70' : 'text-base-content/60'}`}>
                        {format(new Date(s.oa_date), 'dd MMM yyyy')} · {s.start_time?.slice(0,5)}
                      </p>
                      <p className={`text-xs ${selectedSession?.id === s.id ? 'text-primary-content/70' : 'text-base-content/50'}`}>
                        {s.branches?.join(', ')} | {s.attendance_count} present
                      </p>
                    </div>
                    <span className={`badge badge-sm ${selectedSession?.id === s.id ? 'badge-ghost' : statusColors[s.status]}`}>{s.status}</span>
                  </div>
                </div>
              </div>
            ))}
            {!loading && sessions.length === 0 && (
              <div className="card bg-base-100 shadow"><div className="card-body items-center py-8">
                <p className="text-base-content/50">No sessions found for selected filters</p>
              </div></div>
            )}
          </div>

          {/* Attendance Detail + Export */}
          <div className="space-y-3">
            {selectedSession ? (
              <>
                <div className="card bg-base-100 shadow">
                  <div className="card-body">
                    <h3 className="font-bold">{selectedSession.title}</h3>
                    <p className="text-sm text-base-content/60">{format(new Date(selectedSession.oa_date), 'dd MMM yyyy')}</p>
                    <div className="stats stats-horizontal shadow-none mt-2">
                      <div className="stat px-4 py-2">
                        <div className="stat-value text-success text-xl">{attendance.filter(a => a.status === 'present').length}</div>
                        <div className="stat-title text-xs">Present</div>
                      </div>
                      <div className="stat px-4 py-2">
                        <div className="stat-value text-primary text-xl">{attendance.length}</div>
                        <div className="stat-title text-xs">Total Marked</div>
                      </div>
                    </div>

                    {/* Export Controls */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <select className="select select-bordered select-sm flex-1 min-w-0"
                        value={exportBranch} onChange={e => setExportBranch(e.target.value)}>
                        <option value="">All Branches</option>
                        {BRANCHES.filter(Boolean).map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <button className="btn btn-success btn-sm gap-1" onClick={exportExcel}>
                        <FiDownload /> Export Excel
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="table table-xs bg-base-100 rounded-xl shadow">
                    <thead>
                      <tr><th>Scholar No</th><th>Name</th><th>Branch</th><th>Sec</th><th>Score</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {attendance.map(a => (
                        <tr key={a.id}>
                          <td className="font-mono">{a.scholar_no}</td>
                          <td>{a.full_name}</td>
                          <td><span className="badge badge-ghost badge-xs">{a.branch}</span></td>
                          <td>{a.section}</td>
                          <td>{a.face_match_score ? `${a.face_match_score.toFixed(0)}%` : '-'}</td>
                          <td className="text-xs text-base-content/50">
                            {a.marked_at ? format(new Date(a.marked_at), 'HH:mm') : '-'}
                            {a.is_extended && <span className="badge badge-warning badge-xs ml-1">ext</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="card bg-base-100 shadow"><div className="card-body items-center py-12">
                <FiCalendar size={40} className="text-base-content/20" />
                <p className="text-base-content/50 mt-3">Select an OA session to view attendance and export data</p>
              </div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorDashboard;
