import { useState, useEffect } from 'react';
import api from '../../utils/api';
import FaceCapture from '../../components/common/FaceCapture';
import toast from 'react-hot-toast';
import { FiSearch, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';

const VolunteerDashboard = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [scholarNo, setScholarNo] = useState('');
  const [verifyResult, setVerifyResult] = useState(null); // { student, verification }
  const [faceBlob, setFaceBlob] = useState(null);
  const [step, setStep] = useState('select'); // select | scan | verify | confirm | done
  const [loading, setLoading] = useState(false);
  const [attendanceList, setAttendanceList] = useState([]);
  const [activeTab, setActiveTab] = useState('mark');

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const fetchActiveSessions = async () => {
    try {
      const res = await api.get('/oa/active');
      setActiveSessions(res.data.data);
    } catch {}
  };

  const fetchAttendance = async (sessionId) => {
    try {
      const res = await api.get(`/attendance/oa/${sessionId}`);
      setAttendanceList(res.data.data);
    } catch {}
  };

  const selectSession = (session) => {
    setSelectedSession(session);
    setStep('scan');
    fetchAttendance(session.id);
  };

  const handleFaceCapture = async (blob) => {
    setFaceBlob(blob);
    setVerifyResult(null);
  };

  const verifyFace = async () => {
    if (!faceBlob || !scholarNo.trim()) {
      return toast.error('Enter scholar number and capture face');
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('face_image', faceBlob, 'verify.jpg');
    formData.append('scholar_no', scholarNo.trim());
    try {
      const res = await api.post('/face/verify', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setVerifyResult(res.data.data);
      setStep('confirm');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmAttendance = async () => {
    if (!verifyResult?.verification?.isMatch) {
      return toast.error('Face does not match. Cannot mark attendance.');
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('oa_session_id', selectedSession.id);
    formData.append('scholar_no', scholarNo.trim());
    formData.append('face_match_score', verifyResult.verification.matchScore);
    formData.append('liveness_score', verifyResult.verification.livenessScore);
    if (faceBlob) formData.append('capture_image', faceBlob, 'attendance.jpg');
    try {
      await api.post('/attendance', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Attendance marked for ${verifyResult.student.full_name}!`);
      fetchAttendance(selectedSession.id);
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setScholarNo('');
    setFaceBlob(null);
    setVerifyResult(null);
    setStep('scan');
  };

  const extendSession = async () => {
    try {
      const res = await api.patch(`/oa/${selectedSession.id}/extend`);
      toast.success(res.data.message);
      fetchActiveSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Extension failed');
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="tabs tabs-boxed bg-base-100">
          <a className={`tab ${activeTab === 'mark' ? 'tab-active' : ''}`} onClick={() => setActiveTab('mark')}>📸 Mark Attendance</a>
          <a className={`tab ${activeTab === 'list' ? 'tab-active' : ''}`} onClick={() => setActiveTab('list')}>📋 Attendance List</a>
        </div>

        {activeTab === 'mark' && (
          <>
            {/* Step 1: Select Session */}
            {step === 'select' && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold">Select Active OA Session</h2>
                {activeSessions.length === 0 ? (
                  <div className="card bg-base-100 shadow">
                    <div className="card-body items-center py-10">
                      <FiClock size={40} className="text-base-content/20" />
                      <p className="text-base-content/50 mt-2">No active OA sessions right now</p>
                      <button className="btn btn-ghost btn-sm mt-2" onClick={fetchActiveSessions}>Refresh</button>
                    </div>
                  </div>
                ) : activeSessions.map(s => (
                  <div key={s.id} className="card bg-base-100 shadow cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => selectSession(s)}>
                    <div className="card-body py-4 flex-row items-center justify-between">
                      <div>
                        <h3 className="font-bold">{s.title}</h3>
                        <p className="text-sm text-base-content/60">
                          {format(new Date(s.oa_date), 'dd MMM')} · {s.start_time?.slice(0,5)} - {s.end_time?.slice(0,5)}
                        </p>
                        <p className="text-xs text-base-content/50">{s.branches?.join(', ')}</p>
                      </div>
                      <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2: Face Scan */}
            {(step === 'scan' || step === 'confirm') && selectedSession && (
              <div className="space-y-4">
                <div className="card bg-primary text-primary-content">
                  <div className="card-body py-3 flex-row items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-sm">{selectedSession.title}</p>
                      <p className="text-primary-content/70 text-xs">{selectedSession.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-xs btn-ghost text-primary-content" onClick={extendSession}>
                        ⏱ Extend
                      </button>
                      <button className="btn btn-xs btn-ghost text-primary-content" onClick={() => { setStep('select'); setSelectedSession(null); }}>
                        Change
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card bg-base-100 shadow">
                  <div className="card-body">
                    <div className="form-control mb-4">
                      <label className="label"><span className="label-text font-semibold">Scholar Number</span></label>
                      <div className="input input-bordered flex items-center gap-2">
                        <FiSearch className="text-base-content/40" />
                        <input type="text" placeholder="Enter scholar number" className="grow font-mono"
                          value={scholarNo} onChange={e => { setScholarNo(e.target.value); setStep('scan'); setVerifyResult(null); }} />
                      </div>
                    </div>

                    <FaceCapture onCapture={(blob) => handleFaceCapture(blob)} liveness={true} label="Capture Student Face" />

                    {step === 'scan' && faceBlob && (
                      <button className="btn btn-primary w-full mt-4" onClick={verifyFace} disabled={loading}>
                        {loading ? <span className="loading loading-spinner loading-sm" /> : '🔍 Verify Face'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Verification result */}
                {step === 'confirm' && verifyResult && (
                  <div className={`card shadow ${verifyResult.verification.isMatch ? 'bg-success/10 border border-success/30' : 'bg-error/10 border border-error/30'}`}>
                    <div className="card-body">
                      <div className="flex items-center gap-3">
                        {verifyResult.verification.isMatch
                          ? <FiCheckCircle size={32} className="text-success shrink-0" />
                          : <FiXCircle size={32} className="text-error shrink-0" />}
                        <div>
                          <p className="font-bold">{verifyResult.student.full_name}</p>
                          <p className="text-sm text-base-content/60">{verifyResult.student.scholar_no} · {verifyResult.student.branch}-{verifyResult.student.section}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-lg">{verifyResult.verification.matchScore.toFixed(1)}%</p>
                          <p className="text-xs text-base-content/50">Match Score</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">{verifyResult.verification.livenessScore.toFixed(1)}%</p>
                          <p className="text-xs text-base-content/50">Liveness</p>
                        </div>
                        <div className="text-center">
                          <p className={`font-bold text-lg ${verifyResult.verification.isMatch ? 'text-success' : 'text-error'}`}>
                            {verifyResult.verification.isMatch ? 'MATCH' : 'NO MATCH'}
                          </p>
                          <p className="text-xs text-base-content/50">Result (≥{verifyResult.verification.threshold}%)</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button className="btn btn-ghost flex-1" onClick={resetForm}>Cancel</button>
                        {verifyResult.verification.isMatch && (
                          <button className="btn btn-success flex-1" onClick={confirmAttendance} disabled={loading}>
                            {loading ? <span className="loading loading-spinner loading-sm" /> : '✅ Mark Present'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Attendance List Tab */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            {selectedSession ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">{selectedSession?.title}</h2>
                  <span className="badge badge-ghost">{attendanceList.length} marked</span>
                </div>
                <div className="space-y-2">
                  {attendanceList.map(a => (
                    <div key={a.id} className="card bg-base-100 shadow-sm">
                      <div className="card-body py-3 flex-row items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{a.full_name}</p>
                          <p className="text-xs text-base-content/50">{a.scholar_no} · {a.branch}-{a.section}</p>
                        </div>
                        <div className="text-right">
                          <span className="badge badge-success badge-sm">Present</span>
                          {a.is_extended && <span className="badge badge-warning badge-xs ml-1">Extended</span>}
                          <p className="text-xs text-base-content/40 mt-1">{a.face_match_score?.toFixed(0)}% match</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {attendanceList.length === 0 && (
                    <div className="card bg-base-100 shadow"><div className="card-body items-center py-8">
                      <p className="text-base-content/50">No attendance marked yet</p>
                    </div></div>
                  )}
                </div>
              </>
            ) : (
              <div className="card bg-base-100 shadow"><div className="card-body items-center py-10">
                <p className="text-base-content/50">Select an OA session to view attendance</p>
              </div></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard;
