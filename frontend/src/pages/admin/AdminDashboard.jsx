import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiUsers, FiActivity, FiCalendar, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';

const BRANCHES = ['CS', 'IT', 'ECE', 'EE', 'ME', 'CE', 'CH'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E'];
const statusColors = {
  upcoming: 'badge-info',
  active: 'badge-success',
  extended: 'badge-warning',
  closed: 'badge-ghost',
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', description: '', oa_date: '', start_time: '', end_time: '',
    branches: [], sections: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessRes, statsRes, studRes] = await Promise.all([
        api.get('/oa'),
        api.get('/attendance/stats/dashboard'),
        api.get('/students'),
      ]);
      setSessions(sessRes.data.data);
      setStats(statsRes.data.data);
      setStudents(studRes.data.data);
    } catch {}
    setLoading(false);
  };

  const createSession = async (e) => {
    e.preventDefault();
    if (!createForm.branches.length || !createForm.sections.length) {
      return toast.error('Select at least one branch and section');
    }
    try {
      await api.post('/oa', createForm);
      toast.success('OA session created!');
      setShowCreateModal(false);
      setCreateForm({ title: '', description: '', oa_date: '', start_time: '', end_time: '', branches: [], sections: [] });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create OA');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/oa/${id}/status`, { status });
      toast.success('Status updated');
      fetchData();
    } catch {
      toast.error('Update failed');
    }
  };

  const toggleMulti = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="tabs tabs-boxed bg-base-100 flex-wrap">
          {[['dashboard','📊 Dashboard'],['sessions','📋 OA Sessions'],['students','👥 Students']].map(([id,label]) => (
            <a key={id} className={`tab ${activeTab === id ? 'tab-active' : ''}`} onClick={() => setActiveTab(id)}>{label}</a>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg text-primary" /></div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && stats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: '👥', label: 'Total Students', val: stats.total_students, color: 'text-primary' },
                    { icon: '📝', label: 'Total OAs', val: stats.total_oa, color: 'text-secondary' },
                    { icon: '🟢', label: 'Active OAs', val: stats.active_oa, color: 'text-success' },
                    { icon: '✅', label: 'Attendance Marked', val: stats.total_attendance_marked, color: 'text-info' },
                  ].map(({ icon, label, val, color }) => (
                    <div key={label} className="card bg-base-100 shadow">
                      <div className="card-body py-4 px-5">
                        <p className="text-2xl">{icon}</p>
                        <p className={`text-2xl font-bold ${color}`}>{val}</p>
                        <p className="text-xs text-base-content/60">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="card bg-base-100 shadow">
                  <div className="card-body">
                    <h3 className="font-bold text-base">Recent OA Sessions</h3>
                    <div className="overflow-x-auto">
                      <table className="table table-sm">
                        <thead><tr><th>Title</th><th>Date</th><th>Status</th><th>Attendance</th></tr></thead>
                        <tbody>
                          {stats.recent_oa?.map(oa => (
                            <tr key={oa.id}>
                              <td className="font-medium">{oa.title}</td>
                              <td>{format(new Date(oa.oa_date), 'dd MMM yyyy')}</td>
                              <td><span className={`badge ${statusColors[oa.status]} badge-sm`}>{oa.status}</span></td>
                              <td>{oa.attendance_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">OA Sessions</h2>
                  <button className="btn btn-primary btn-sm gap-1" onClick={() => setShowCreateModal(true)}>
                    <FiPlus /> New OA
                  </button>
                </div>
                {sessions.map(s => (
                  <div key={s.id} className="card bg-base-100 shadow-sm">
                    <div className="card-body py-4">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-bold">{s.title}</h3>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-base-content/60">
                            <span className="flex items-center gap-1"><FiCalendar size={11}/>{format(new Date(s.oa_date), 'dd MMM yyyy')}</span>
                            <span className="flex items-center gap-1"><FiClock size={11}/>{s.start_time?.slice(0,5)} - {s.end_time?.slice(0,5)}</span>
                            <span>📚 {s.branches?.join(', ')}</span>
                            <span>👥 {s.attendance_count} present</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`badge ${statusColors[s.status]}`}>{s.status}</span>
                          <select
                            className="select select-bordered select-xs"
                            value={s.status}
                            onChange={e => updateStatus(s.id, e.target.value)}
                          >
                            {['upcoming','active','extended','closed'].map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="card bg-base-100 shadow"><div className="card-body items-center py-10">
                    <p className="text-base-content/50">No OA sessions yet. Create one!</p>
                  </div></div>
                )}
              </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Students ({students.length})</h2>
                <div className="overflow-x-auto">
                  <table className="table table-sm bg-base-100 rounded-xl shadow">
                    <thead>
                      <tr><th>Scholar No</th><th>Name</th><th>Branch</th><th>Section</th><th>Face</th></tr>
                    </thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id}>
                          <td className="font-mono text-sm">{s.scholar_no}</td>
                          <td>{s.full_name}</td>
                          <td><span className="badge badge-ghost badge-sm">{s.branch}</span></td>
                          <td>{s.section}</td>
                          <td>
                            {s.face_registered
                              ? <span className="text-success text-xs font-semibold">✓ Registered</span>
                              : <span className="text-error text-xs">✗ Pending</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create OA Modal */}
      {showCreateModal && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box w-11/12 max-w-2xl">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowCreateModal(false)}>✕</button>
            <h3 className="font-bold text-lg mb-4">Create New OA Session</h3>
            <form onSubmit={createSession} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Title</span></label>
                <input type="text" className="input input-bordered" placeholder="e.g. Infosys OA - Round 1"
                  value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Description (optional)</span></label>
                <textarea className="textarea textarea-bordered" rows={2}
                  value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Date</span></label>
                  <input type="date" className="input input-bordered" value={createForm.oa_date}
                    onChange={e => setCreateForm(p => ({ ...p, oa_date: e.target.value }))} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Start Time</span></label>
                  <input type="time" className="input input-bordered" value={createForm.start_time}
                    onChange={e => setCreateForm(p => ({ ...p, start_time: e.target.value }))} required />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">End Time</span></label>
                  <input type="time" className="input input-bordered" value={createForm.end_time}
                    onChange={e => setCreateForm(p => ({ ...p, end_time: e.target.value }))} required />
                </div>
              </div>
              <div>
                <p className="label-text font-semibold mb-2">Branches</p>
                <div className="flex flex-wrap gap-2">
                  {BRANCHES.map(b => (
                    <label key={b} className="cursor-pointer">
                      <input type="checkbox" className="hidden" checked={createForm.branches.includes(b)}
                        onChange={() => setCreateForm(p => ({ ...p, branches: p.branches.includes(b) ? p.branches.filter(x => x !== b) : [...p.branches, b] }))} />
                      <span className={`badge badge-lg cursor-pointer ${createForm.branches.includes(b) ? 'badge-primary' : 'badge-outline'}`}>{b}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="label-text font-semibold mb-2">Sections</p>
                <div className="flex flex-wrap gap-2">
                  {SECTIONS.map(s => (
                    <label key={s} className="cursor-pointer">
                      <input type="checkbox" className="hidden" checked={createForm.sections.includes(s)}
                        onChange={() => setCreateForm(p => ({ ...p, sections: p.sections.includes(s) ? p.sections.filter(x => x !== s) : [...p.sections, s] }))} />
                      <span className={`badge badge-lg cursor-pointer ${createForm.sections.includes(s) ? 'badge-secondary' : 'badge-outline'}`}>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create OA</button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}></div>
        </dialog>
      )}
    </div>
  );
};

export default AdminDashboard;
