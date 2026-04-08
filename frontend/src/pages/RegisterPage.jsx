import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiEye, FiEyeOff, FiMail, FiUser, FiHash, FiLock, FiCheck } from 'react-icons/fi';

const BRANCHES = ['CS', 'IT', 'ECE', 'EE', 'ME', 'CE', 'CH'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

const RegisterPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState(1); // 1 = form, 2 = OTP
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({
    login_id: '',
    password: '',
    full_name: '',
    scholar_no: '',
    branch: '',
    section: '',
  });

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const derivedEmail = form.scholar_no ? `${form.scholar_no}@stu.manit.ac.in`.toLowerCase() : '';

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!form.branch || !form.section) {
      toast.error('Please select branch and section');
      return;
    }
    if (!form.scholar_no) {
      toast.error('Please enter your scholar number');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: derivedEmail });
      toast.success('OTP sent to your institute email!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-otp-register', { ...form, email: derivedEmail, otp });
      toast.success('Account created! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${isDark ? 'gradient-bg-dark' : 'gradient-bg-light'}`}>
      {/* Floating shapes */}
      <div className="floating-shape w-80 h-80 bg-secondary animate-float -top-24 -right-24" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }} />
      <div className="floating-shape w-64 h-64 bg-primary animate-float-delay -bottom-16 -left-16" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }} />

      <div className="w-full max-w-lg animate-fade-in relative z-10">
        <div className="glass-card p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/login" className="btn btn-ghost btn-circle btn-sm">
              <FiArrowLeft size={18} />
            </Link>
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold text-gradient">Student Registration</h2>
              <p className="text-base-content/50 text-sm mt-0.5">Create your account to track OA attendance</p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${step >= 1 ? 'bg-primary text-white' : 'bg-base-300 text-base-content/50'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{step > 1 ? <FiCheck size={12} /> : '1'}</span>
              Details
            </div>
            <div className={`flex-1 h-0.5 rounded ${step >= 2 ? 'bg-primary' : 'bg-base-300'}`} />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${step >= 2 ? 'bg-primary text-white' : 'bg-base-300 text-base-content/50'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
              Verify
            </div>
          </div>

          {/* Step 1: Registration Form */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control sm:col-span-2">
                  <label className="label"><span className="label-text font-semibold">Full Name</span></label>
                  <div className="input input-bordered input-premium flex items-center gap-2">
                    <FiUser className="text-base-content/40 shrink-0" />
                    <input type="text" placeholder="e.g. Rahul Kumar" className="grow bg-transparent outline-none"
                      value={form.full_name} onChange={set('full_name')} required minLength={2} />
                  </div>
                </div>

                <div className="form-control sm:col-span-2">
                  <label className="label"><span className="label-text font-semibold">Scholar No.</span></label>
                  <div className="input input-bordered input-premium flex items-center gap-2">
                    <FiHash className="text-base-content/40 shrink-0" />
                    <input type="text" placeholder="e.g. 2311201380" className="grow bg-transparent outline-none font-mono"
                      value={form.scholar_no} onChange={set('scholar_no')} required />
                  </div>
                  <label className="label"><span className="label-text-alt text-base-content/40">OTP will be sent to <strong>{derivedEmail || 'your institute email'}</strong></span></label>
                </div>

                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Login ID</span></label>
                  <div className="input input-bordered input-premium flex items-center gap-2">
                    <FiUser className="text-base-content/40 shrink-0" />
                    <input type="text" placeholder="Choose a login ID" className="grow bg-transparent outline-none"
                      value={form.login_id} onChange={set('login_id')} required minLength={3} />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Branch</span></label>
                  <select className="select select-bordered" value={form.branch} onChange={set('branch')} required>
                    <option value="">Select Branch</option>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Section</span></label>
                  <select className="select select-bordered" value={form.section} onChange={set('section')} required>
                    <option value="">Select Section</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="form-control sm:col-span-2">
                  <label className="label"><span className="label-text font-semibold">Password</span></label>
                  <div className="input input-bordered input-premium flex items-center gap-2">
                    <FiLock className="text-base-content/40 shrink-0" />
                    <input type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" className="grow bg-transparent outline-none"
                      value={form.password} onChange={set('password')} required minLength={6} />
                    <button type="button" onClick={() => setShowPass(p => !p)} className="text-base-content/40 hover:text-base-content transition-colors">
                      {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex items-start gap-2 text-sm text-base-content/70">
                <span className="text-lg">📸</span>
                <span>After registration, you'll need to register your face for attendance verification.</span>
              </div>

              <button type="submit" className="btn btn-gradient w-full h-12 text-base" disabled={loading}>
                {loading ? <span className="loading loading-spinner loading-sm" /> : 'Send OTP & Continue'}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <FiMail size={28} className="text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-1">Verify Your Email</h3>
                <p className="text-sm text-base-content/50">
                  We've sent a 6-digit OTP to <span className="font-semibold text-primary">{derivedEmail}</span>
                </p>
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Enter OTP</span></label>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  className="input input-bordered input-lg text-center tracking-[0.5em] font-mono font-bold text-xl"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button type="button" className="btn btn-ghost flex-1" onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button type="submit" className="btn btn-gradient flex-1 h-12" disabled={loading || otp.length !== 6}>
                  {loading ? <span className="loading loading-spinner loading-sm" /> : 'Verify & Register'}
                </button>
              </div>

              <button
                type="button"
                className="btn btn-link btn-sm text-primary w-full"
                onClick={handleSendOtp}
                disabled={loading}
              >
                Resend OTP
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
