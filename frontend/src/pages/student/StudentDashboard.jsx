import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import FaceCapture from '../../components/common/FaceCapture';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiAlertCircle, FiCalendar, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';

const StudentDashboard = () => {
  const { user, setUser } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [faceBlob, setFaceBlob] = useState(null);
  const [registeringFace, setRegisteringFace] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

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

  const faceRegistered = user?.face_registered;

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Profile card */}
        <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content shadow-lg">
          <div className="card-body py-5">
            <div className="flex items-center gap-4">
              <div className="avatar placeholder">
                <div className="bg-white/20 text-primary-content rounded-full w-14 text-xl flex items-center justify-center">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{user?.full_name}</h2>
                <p className="text-primary-content/70 text-sm">{user?.scholar_no} · {user?.branch} - {user?.section}</p>
              </div>
              <div className={`badge ${faceRegistered ? 'badge-success' : 'badge-warning'} gap-1`}>
                {faceRegistered ? <><FiCheckCircle size={12} /> Face OK</> : <><FiAlertCircle size={12} /> No Face</>}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed bg-base-100">
          <a className={`tab ${activeTab === 'home' ? 'tab-active' : ''}`} onClick={() => setActiveTab('home')}>🏠 Home</a>
          <a className={`tab ${activeTab === 'face' ? 'tab-active' : ''}`} onClick={() => setActiveTab('face')}>📷 Face Setup</a>
          <a className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`} onClick={() => setActiveTab('history')}>📋 History</a>
        </div>

        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {!faceRegistered && (
              <div className="alert alert-warning shadow">
                <FiAlertCircle size={20} />
                <div>
                  <p className="font-semibold">Face not registered</p>
                  <p className="text-sm">You must register your face to participate in OA attendance verification.</p>
                </div>
                <button className="btn btn-sm btn-warning" onClick={() => setActiveTab('face')}>Register Now</button>
              </div>
            )}
            <div className="stats stats-vertical sm:stats-horizontal shadow w-full bg-base-100">
              <div className="stat">
                <div className="stat-title">Total OAs</div>
                <div className="stat-value text-primary">{history.length}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Present</div>
                <div className="stat-value text-success">{history.filter(h => h.status === 'present').length}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Absent</div>
                <div className="stat-value text-error">{history.filter(h => h.status !== 'present').length}</div>
              </div>
            </div>
          </div>
        )}

        {/* Face Setup Tab */}
        {activeTab === 'face' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body items-center text-center">
              {faceRegistered ? (
                <div className="space-y-3">
                  <div className="text-5xl">✅</div>
                  <h3 className="text-lg font-bold text-success">Face Registered</h3>
                  <p className="text-base-content/60 text-sm">Your face pattern is stored. Contact TPO admin to reset if needed.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold">Register Your Face</h3>
                  <p className="text-sm text-base-content/60 mb-4">
                    Position your face within the circle. Follow the liveness prompts to blink naturally.
                    Only your face pattern (not the image) will be stored.
                  </p>
                  <FaceCapture onCapture={(blob) => setFaceBlob(blob)} liveness={true} />
                  {faceBlob && (
                    <button className="btn btn-primary btn-wide mt-2" onClick={handleFaceRegister} disabled={registeringFace}>
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
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8"><span className="loading loading-spinner loading-lg text-primary" /></div>
            ) : history.length === 0 ? (
              <div className="card bg-base-100 shadow">
                <div className="card-body items-center text-center py-10">
                  <p className="text-base-content/50">No OA attendance records yet</p>
                </div>
              </div>
            ) : history.map(item => (
              <div key={item.id} className="card bg-base-100 shadow-sm">
                <div className="card-body py-4 flex-row items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <div className="flex items-center gap-3 text-xs text-base-content/60 mt-1">
                      <span className="flex items-center gap-1"><FiCalendar size={11} />{format(new Date(item.oa_date), 'dd MMM yyyy')}</span>
                      <span className="flex items-center gap-1"><FiClock size={11} />{item.start_time?.slice(0,5)} - {item.end_time?.slice(0,5)}</span>
                    </div>
                    {item.is_extended && <span className="badge badge-warning badge-xs mt-1">Extended</span>}
                  </div>
                  <div>
                    <span className={`badge ${item.status === 'present' ? 'badge-success' : 'badge-error'} badge-lg`}>
                      {item.status === 'present' ? '✓ Present' : '✗ Absent'}
                    </span>
                    {item.face_match_score && (
                      <p className="text-xs text-center mt-1 text-base-content/40">{item.face_match_score.toFixed(0)}% match</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
