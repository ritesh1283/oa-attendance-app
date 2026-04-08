import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import FaceCapture from '../../components/common/FaceCapture';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiAlertCircle, FiCalendar, FiClock, FiTrash2, FiEye, FiEyeOff, FiHash } from 'react-icons/fi';
import { format } from 'date-fns';

const StudentDashboard = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faceBlob, setFaceBlob] = useState(null);
  const [registeringFace, setRegisteringFace] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ scholar_no: '', password: '' });
  const [deleting, setDeleting] = useState(false);
  const [showDelPass, setShowDelPass] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/attendance/history');
      setHistory(res.data.data);
    } catch {}
    setLoading(false);
  };

  const handleFaceRegister = async () => {
    if (!faceBlob) return toast.error('Please capture your face first');
    setRegisteringFace(true);
    const formData = new FormData();
    formData.append('face_image', faceBlob, 'face.jpg');
    try {
      await api.post('/face/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Face registered successfully!');
      setUser(u => ({ ...u, face_registered: 1 }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Face registration failed');
    } finally {
      setRegisteringFace(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await api.delete('/auth/account', {
        data: { scholar_no: deleteForm.scholar_no, password: deleteForm.password }
      });
      toast.success('Account deleted successfully');
      await logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const faceRegistered = user?.face_registered;
  const presentCount = history.filter(h => h.status === 'present').length;
  const absentCount = history.filter(h => h.status !== 'present').length;

  const tabs = [
    { id: 'home', label: '🏠 Home' },
    { id: 'face', label: '📷 Face Setup' },
    { id: 'history', label: '📋 History' },
    { id: 'settings', label: '⚙️ Settings' },
  ];

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Profile card */}
        <div className="profile-gradient rounded-2xl shadow-lg p-5 text-white animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-bold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{user?.full_name}</h2>
              <p className="text-white/70 text-sm">{user?.scholar_no} · {user?.branch} - {user?.section}</p>
            </div>
            <div className={`badge ${faceRegistered ? 'bg-green-500/20 text-green-100 border-green-400/30' : 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30'} gap-1 px-3 py-2`}>
              {faceRegistered ? <><FiCheckCircle size={12} /> Face OK</> : <><FiAlertCircle size={12} /> No Face</>}
            </div>
          </div>
        </div>

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

        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-fade-in">
            {!faceRegistered && (
              <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 flex items-start gap-3">
                <FiAlertCircle size={20} className="text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Face not registered</p>
                  <p className="text-xs text-base-content/60 mt-0.5">You must register your face to participate in OA attendance verification.</p>
                </div>
                <button className="btn btn-warning btn-sm" onClick={() => setActiveTab('face')}>Register</button>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total OAs', val: history.length, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Present', val: presentCount, color: 'text-success', bg: 'bg-success/10' },
                { label: 'Absent', val: absentCount, color: 'text-error', bg: 'bg-error/10' },
              ].map(({ label, val, color, bg }) => (
                <div key={label} className={`stat-card ${bg} text-center`}>
                  <p className={`text-3xl font-extrabold ${color}`}>{val}</p>
                  <p className="text-xs text-base-content/50 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Face Setup Tab */}
        {activeTab === 'face' && (
          <div className="card bg-base-100 shadow-sm rounded-2xl animate-fade-in">
            <div className="card-body items-center text-center">
              {faceRegistered ? (
                <div className="space-y-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                    <FiCheckCircle size={32} className="text-success" />
                  </div>
                  <h3 className="text-lg font-bold text-success">Face Registered</h3>
                  <p className="text-base-content/50 text-sm max-w-xs">Your face pattern is stored. Contact TPO admin to reset if needed.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold">Register Your Face</h3>
                  <p className="text-sm text-base-content/50 mb-4">
                    Only your face pattern (not the image) will be stored.
                  </p>
                  <FaceCapture onCapture={(blob) => setFaceBlob(blob)} label="📸 Click to Capture" />
                  {faceBlob && (
                    <button className="btn btn-gradient btn-wide mt-3" onClick={handleFaceRegister} disabled={registeringFace}>
                      {registeringFace ? <span className="loading loading-spinner loading-sm" /> : '✅ Complete Registration'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3 animate-fade-in">
            {loading ? (
              <div className="flex justify-center py-8"><span className="loading loading-spinner loading-lg text-primary" /></div>
            ) : history.length === 0 ? (
              <div className="card bg-base-100 shadow-sm rounded-2xl">
                <div className="card-body items-center text-center py-10">
                  <FiCalendar size={40} className="text-base-content/20" />
                  <p className="text-base-content/40 mt-2">No OA attendance records yet</p>
                </div>
              </div>
            ) : history.map(item => (
              <div key={item.id} className="card bg-base-100 shadow-sm rounded-2xl card-hover">
                <div className="card-body py-4 flex-row items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <div className="flex items-center gap-3 text-xs text-base-content/50 mt-1">
                      <span className="flex items-center gap-1"><FiCalendar size={11} />{format(new Date(item.oa_date), 'dd MMM yyyy')}</span>
                      <span className="flex items-center gap-1"><FiClock size={11} />{item.start_time?.slice(0,5)} - {item.end_time?.slice(0,5)}</span>
                    </div>
                    {item.is_extended && <span className="badge badge-warning badge-xs mt-1">Extended</span>}
                  </div>
                  <div className="text-right">
                    <span className={`badge ${item.status === 'present' ? 'badge-success' : 'badge-error'} badge-lg gap-1`}>
                      {item.status === 'present' ? '✓ Present' : '✗ Absent'}
                    </span>
                    {item.face_match_score && (
                      <p className="text-xs text-base-content/40 mt-1">{item.face_match_score.toFixed(0)}% match</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4 animate-fade-in">
            <div className="card bg-base-100 shadow-sm rounded-2xl">
              <div className="card-body">
                <h3 className="font-bold text-lg mb-2">Account Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-base-200 rounded-xl p-3">
                    <p className="text-base-content/50 text-xs">Login ID</p>
                    <p className="font-semibold">{user?.login_id}</p>
                  </div>
                  <div className="bg-base-200 rounded-xl p-3">
                    <p className="text-base-content/50 text-xs">Scholar No</p>
                    <p className="font-semibold font-mono">{user?.scholar_no}</p>
                  </div>
                  <div className="bg-base-200 rounded-xl p-3">
                    <p className="text-base-content/50 text-xs">Branch</p>
                    <p className="font-semibold">{user?.branch}</p>
                  </div>
                  <div className="bg-base-200 rounded-xl p-3">
                    <p className="text-base-content/50 text-xs">Section</p>
                    <p className="font-semibold">{user?.section}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card bg-error/5 border border-error/20 rounded-2xl">
              <div className="card-body">
                <h3 className="font-bold text-error flex items-center gap-2">
                  <FiTrash2 size={16} /> Danger Zone
                </h3>
                <p className="text-sm text-base-content/60 mt-1">
                  Once you delete your account, all your data including attendance records will be permanently lost.
                </p>
                <button
                  className="btn btn-error btn-outline btn-sm mt-3 w-fit"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <dialog open className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box glass-card max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                <FiTrash2 size={18} className="text-error" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-error">Delete Account</h3>
                <p className="text-base-content/50 text-sm">This action cannot be undone</p>
              </div>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Scholar Number</span></label>
                <div className="input input-bordered input-premium flex items-center gap-2">
                  <FiHash className="text-base-content/40" />
                  <input
                    type="text"
                    placeholder="Enter your scholar number"
                    className="grow bg-transparent outline-none font-mono"
                    value={deleteForm.scholar_no}
                    onChange={e => setDeleteForm(p => ({ ...p, scholar_no: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Password</span></label>
                <div className="input input-bordered input-premium flex items-center gap-2">
                  <FiEye className="text-base-content/40" />
                  <input
                    type={showDelPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="grow bg-transparent outline-none"
                    value={deleteForm.password}
                    onChange={e => setDeleteForm(p => ({ ...p, password: e.target.value }))}
                    required
                  />
                  <button type="button" onClick={() => setShowDelPass(p => !p)} className="text-base-content/40 hover:text-base-content">
                    {showDelPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn btn-ghost flex-1" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-error flex-1" disabled={deleting}>
                  {deleting ? <span className="loading loading-spinner loading-sm" /> : 'Delete Forever'}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setShowDeleteModal(false)} />
        </dialog>
      )}
    </div>
  );
};

export default StudentDashboard;
