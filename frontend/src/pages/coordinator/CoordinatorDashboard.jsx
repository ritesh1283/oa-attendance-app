import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiDownload, FiFilter, FiCalendar, FiSearch, FiUsers } from 'react-icons/fi';
import { format } from 'date-fns';

const BRANCHES = ['', 'CS', 'MDS', 'ECE', 'EE', 'ME', 'Civil Eng', 'Chem Eng'];

const CoordinatorDashboard = () => {
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessions, setSessions] = useState([]);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', date: '' });
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportBranch, setExportBranch] = useState('');

  // Students tab state
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentBranch, setStudentBranch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  const statusColors = { upcoming:'badge-info', active:'badge-success', extended:'badge-warning', closed:'bg-base-300 text-base-content/50' };

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

  const exportExcel = async () => {
    if (!selectedSession) return;
    try {
      const res = await api.get(`/attendance/export/${selectedSession.id}`, {
        params: exportBranch ? { branch: exportBranch } : {},
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `OA_${selectedSession.title}_${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Excel downloaded!');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const params = {};
      if (studentSearch) params.search = studentSearch;
      if (studentBranch) params.branch = studentBranch;
      const res = await api.get('/students', { params });
      setStudents(res.data.data);
    } catch {}
    setLoadingStudents(false);
  };

  useEffect(() => {
    if (activeTab === 'students') fetchStudents();
  }, [activeTab]);

  const tabs = [
    { id: 'sessions', label: '📋 Sessions' },
    { id: 'students', label: '👥 Students' },
  ];

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="bg-base-100 rounded-2xl p-1.5 flex gap-1 shadow-sm">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-primary text-white shadow-md'
                  : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
              }`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <>
            {/* Filters */}
            <div className="card bg-base-100 shadow-sm rounded-2xl">
              <div className="card-body">
                <h2 className="text-base font-bold flex items-center gap-2"><FiFilter size={16} /> Filter OA Sessions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
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
                  <button className="btn btn-gradient btn-sm" onClick={fetchSessions}>Apply Filter</button>
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
                    className={`card shadow-sm cursor-pointer transition-all rounded-2xl ${selectedSession?.id === s.id ? 'profile-gradient text-white ring-2 ring-primary' : 'bg-base-100 card-hover'}`}
                    onClick={() => viewAttendance(s)}>
                    <div className="card-body py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm">{s.title}</h3>
                          <p className={`text-xs mt-1 ${selectedSession?.id === s.id ? 'text-white/70' : 'text-base-content/50'}`}>
                            {format(new Date(s.oa_date), 'dd MMM yyyy')} · {s.start_time?.slice(0,5)}
                          </p>
                          <p className={`text-xs ${selectedSession?.id === s.id ? 'text-white/70' : 'text-base-content/40'}`}>
                            {s.branches?.join(', ')} | {s.attendance_count} present
                          </p>
                        </div>
                        <span className={`badge badge-sm ${selectedSession?.id === s.id ? 'bg-white/20 text-white border-0' : statusColors[s.status]}`}>{s.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {!loading && sessions.length === 0 && (
                  <div className="card bg-base-100 shadow-sm rounded-2xl">
                    <div className="card-body items-center py-8">
                      <p className="text-base-content/40">No sessions found for selected filters</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Attendance Detail + Export */}
              <div className="space-y-3">
                {selectedSession ? (
                  <>
                    <div className="card bg-base-100 shadow-sm rounded-2xl">
                      <div className="card-body">
                        <h3 className="font-bold">{selectedSession.title}</h3>
                        <p className="text-sm text-base-content/50">{format(new Date(selectedSession.oa_date), 'dd MMM yyyy')}</p>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="stat-card bg-success/10 text-center">
                            <p className="text-2xl font-extrabold text-success">{attendance.filter(a => a.status === 'present').length}</p>
                            <p className="text-xs text-base-content/50">Present</p>
                          </div>
                          <div className="stat-card bg-primary/10 text-center">
                            <p className="text-2xl font-extrabold text-primary">{attendance.length}</p>
                            <p className="text-xs text-base-content/50">Total Marked</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <select className="select select-bordered select-sm flex-1 min-w-0 rounded-xl"
                            value={exportBranch} onChange={e => setExportBranch(e.target.value)}>
                            <option value="">All Branches</option>
                            {BRANCHES.filter(Boolean).map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                          <button className="btn btn-success btn-sm gap-1 rounded-xl" onClick={exportExcel}>
                            <FiDownload size={14} /> Export Excel
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="table table-xs bg-base-100 rounded-2xl shadow-sm">
                        <thead>
                          <tr><th>Scholar No</th><th>Name</th><th>Branch</th><th>Sec</th><th>Score</th><th>Time</th></tr>
                        </thead>
                        <tbody>
                          {attendance.map(a => (
                            <tr key={a.id} className="hover">
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
                  <div className="card bg-base-100 shadow-sm rounded-2xl">
                    <div className="card-body items-center py-12">
                      <FiCalendar size={40} className="text-base-content/20" />
                      <p className="text-base-content/40 mt-3">Select an OA session to view attendance and export data</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-bold flex items-center gap-2"><FiUsers size={18} /> Student Information</h2>
              <span className="badge badge-ghost">{students.length} students</span>
            </div>

            <div className="card bg-base-100 shadow-sm rounded-2xl">
              <div className="card-body py-3">
                <div className="flex gap-3 flex-wrap">
                  <div className="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-[200px]">
                    <FiSearch className="text-base-content/40" />
                    <input
                      type="text" placeholder="Search by name or scholar no..."
                      className="grow bg-transparent outline-none"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && fetchStudents()}
                    />
                  </div>
                  <select className="select select-bordered select-sm rounded-xl" value={studentBranch}
                    onChange={e => { setStudentBranch(e.target.value); }}>
                    <option value="">All Branches</option>
                    {BRANCHES.filter(Boolean).map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <button className="btn btn-gradient btn-sm" onClick={fetchStudents}>Search</button>
                </div>
              </div>
            </div>

            {loadingStudents ? (
              <div className="flex justify-center py-8"><span className="loading loading-spinner loading-lg text-primary" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm bg-base-100 rounded-2xl shadow-sm">
                  <thead>
                    <tr><th>Scholar No</th><th>Name</th><th>Branch</th><th>Section</th><th>Face</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id} className="hover">
                        <td className="font-mono text-sm">{s.scholar_no}</td>
                        <td className="font-medium">{s.full_name}</td>
                        <td><span className="badge badge-ghost badge-sm">{s.branch}</span></td>
                        <td>{s.section}</td>
                        <td>
                          {s.face_registered
                            ? <span className="text-success text-xs font-semibold">✓ Registered</span>
                            : <span className="text-error text-xs">✗ Pending</span>}
                        </td>
                        <td>
                          {s.is_active
                            ? <span className="badge badge-success badge-xs">Active</span>
                            : <span className="badge badge-error badge-xs">Inactive</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingStudents && students.length === 0 && (
              <div className="card bg-base-100 shadow-sm rounded-2xl">
                <div className="card-body items-center py-8">
                  <p className="text-base-content/40">No students found</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinatorDashboard;
