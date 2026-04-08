import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiPlus, FiUsers, FiCalendar, FiClock, FiTrash2, FiUserPlus, FiEye, FiEyeOff, FiX } from 'react-icons/fi';
import { format } from 'date-fns';

const BRANCHES = ['CS', 'MDS', 'ECE', 'EE', 'ME', 'Civil Eng', 'Chem Eng'];
const SECTIONS = ['1', '2', '3'];
const statusColors = {
  upcoming: 'badge-info',
  active: 'badge-success',
  extended: 'badge-warning',
  closed: 'bg-base-300 text-base-content/50',
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', description: '', oa_date: '', start_time: '', end_time: '',
    branches: [], sections: [],
  });
  const [volunteerForm, setVolunteerForm] = useState({
    login_id: '', password: '', full_name: '', role: 'tpo_volunteer',
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
    // Fetch volunteers
    try {
      const res = await api.get('/auth/staff');
      setVolunteers(res.data.data || []);
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

  const createVolunteer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/create-staff', volunteerForm);
      toast.success('Staff account created!');
      setShowVolunteerModal(false);
      setVolunteerForm({ login_id: '', password: '', full_name: '', role: 'tpo_volunteer' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account');
    }
  };

  const deleteVolunteer = async (userId) => {
    if (!confirm('Delete this staff account? This cannot be undone.')) return;
    try {
      await api.delete(`/auth/staff/${userId}`);
      toast.success('Staff account deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'sessions', label: '📋 Sessions' },
    { id: 'students', label: '👥 Students' },
    { id: 'volunteers', label: '🛡️ Staff' },
  ];

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="bg-base-100 rounded-2xl p-1.5 flex gap-1 shadow-sm flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all min-w-fit ${
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

        {loading ? (
          <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg text-primary" /></div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && stats && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: '👥', label: 'Total Students', val: stats.total_students, color: 'text-primary', bg: 'bg-primary/10' },
                    { icon: '📝', label: 'Total OAs', val: stats.total_oa, color: 'text-secondary', bg: 'bg-secondary/10' },
                    { icon: '🟢', label: 'Active OAs', val: stats.active_oa, color: 'text-success', bg: 'bg-success/10' },
                    { icon: '✅', label: 'Marked', val: stats.total_attendance_marked, color: 'text-info', bg: 'bg-info/10' },
                  ].map(({ icon, label, val, color, bg }) => (
                    <div key={label} className={`stat-card ${bg}`}>
                      <p className="text-2xl mb-1">{icon}</p>
                      <p className={`text-2xl font-extrabold ${color}`}>{val}</p>
                      <p className="text-xs text-base-content/50 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="card bg-base-100 shadow-sm rounded-2xl">
                  <div className="card-body">
                    <h3 className="font-bold text-base">Recent OA Sessions</h3>
                    <div className="overflow-x-auto">
                      <table className="table table-sm">
                        <thead><tr><th>Title</th><th>Date</th><th>Status</th><th>Attendance</th></tr></thead>
                        <tbody>
                          {stats.recent_oa?.map(oa => (
                            <tr key={oa.id} className="hover">
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
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">OA Sessions</h2>
                  <button className="btn btn-gradient btn-sm gap-1" onClick={() => setShowCreateModal(true)}>
                    <FiPlus size={16} /> New OA
                  </button>
                </div>
                {sessions.map(s => (
                  <div key={s.id} className="card bg-base-100 shadow-sm rounded-2xl card-hover">
                    <div className="card-body py-4">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-bold">{s.title}</h3>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-base-content/50">
                            <span className="flex items-center gap-1"><FiCalendar size={11}/>{format(new Date(s.oa_date), 'dd MMM yyyy')}</span>
                            <span className="flex items-center gap-1"><FiClock size={11}/>{s.start_time?.slice(0,5)} - {s.end_time?.slice(0,5)}</span>
                            <span>📚 {s.branches?.join(', ')}</span>
                            <span>👥 {s.attendance_count} present</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`badge ${statusColors[s.status]}`}>{s.status}</span>
                          <select
                            className="select select-bordered select-xs rounded-xl"
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
                  <div className="card bg-base-100 shadow-sm rounded-2xl">
                    <div className="card-body items-center py-10">
                      <p className="text-base-content/40">No OA sessions yet. Create one!</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-bold">Students ({students.length})</h2>
                <div className="overflow-x-auto">
                  <table className="table table-sm bg-base-100 rounded-2xl shadow-sm">
                    <thead>
                      <tr><th>Scholar No</th><th>Name</th><th>Branch</th><th>Section</th><th>Face</th></tr>
                    </thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id} className="hover">
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

            {/* Volunteers/Staff Tab */}
            {activeTab === 'volunteers' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">Staff Accounts</h2>
                  <button className="btn btn-gradient btn-sm gap-1" onClick={() => setShowVolunteerModal(true)}>
                    <FiUserPlus size={16} /> Add Staff
                  </button>
                </div>
                {volunteers.length === 0 ? (
                  <div className="card bg-base-100 shadow-sm rounded-2xl">
                    <div className="card-body items-center py-10">
                      <FiUsers size={40} className="text-base-content/20" />
                      <p className="text-base-content/40 mt-2">No staff accounts found</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {volunteers.map(v => (
                      <div key={v.id} className="card bg-base-100 shadow-sm rounded-2xl card-hover">
                        <div className="card-body py-4 flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full profile-gradient flex items-center justify-center text-white font-bold text-sm">
                              {v.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold">{v.full_name}</p>
                              <p className="text-xs text-base-content/50">{v.login_id} · <span className="badge badge-ghost badge-xs">{v.role}</span></p>
                            </div>
                          </div>
                          <button
                            className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
                            onClick={() => deleteVolunteer(v.id)}
                            title="Delete staff account"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create OA Modal */}
      {showCreateModal && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box glass-card w-11/12 max-w-2xl">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" onClick={() => setShowCreateModal(false)}>
              <FiX size={16} />
            </button>
            <h3 className="font-bold text-lg mb-4 text-gradient">Create New OA Session</h3>
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
                      <span className={`badge badge-lg cursor-pointer transition-all ${createForm.branches.includes(b) ? 'badge-primary' : 'badge-outline'}`}>{b}</span>
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
                      <span className={`badge badge-lg cursor-pointer transition-all ${createForm.sections.includes(s) ? 'badge-secondary' : 'badge-outline'}`}>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-gradient">Create OA</button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setShowCreateModal(false)} />
        </dialog>
      )}

      {/* Create Staff Modal */}
      {showVolunteerModal && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box glass-card max-w-md">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" onClick={() => setShowVolunteerModal(false)}>
              <FiX size={16} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl profile-gradient flex items-center justify-center">
                <FiUserPlus size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Add Staff Account</h3>
                <p className="text-base-content/50 text-sm">Create volunteer or coordinator</p>
              </div>
            </div>
            <form onSubmit={createVolunteer} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Full Name</span></label>
                <input type="text" className="input input-bordered" placeholder="Staff member name"
                  value={volunteerForm.full_name} onChange={e => setVolunteerForm(p => ({ ...p, full_name: e.target.value }))} required minLength={2} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Login ID</span></label>
                <input type="text" className="input input-bordered" placeholder="Choose a login ID"
                  value={volunteerForm.login_id} onChange={e => setVolunteerForm(p => ({ ...p, login_id: e.target.value }))} required minLength={3} />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Password</span></label>
                <div className="input input-bordered flex items-center gap-2">
                  <input type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" className="grow"
                    value={volunteerForm.password} onChange={e => setVolunteerForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
                  <button type="button" onClick={() => setShowPass(p => !p)} className="text-base-content/40">
                    {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Role</span></label>
                <select className="select select-bordered" value={volunteerForm.role}
                  onChange={e => setVolunteerForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="tpo_volunteer">TPO Volunteer</option>
                  <option value="tpo_coordinator">TPO Coordinator</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn btn-ghost flex-1" onClick={() => setShowVolunteerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-gradient flex-1">Create Account</button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setShowVolunteerModal(false)} />
        </dialog>
      )}
    </div>
  );
};

export default AdminDashboard;
