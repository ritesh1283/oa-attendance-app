import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiEye, FiEyeOff, FiMail, FiUser, FiHash, FiLock, FiCheck } from 'react-icons/fi';

const BRANCHES = ['CS', 'MDS', 'ECE', 'EE', 'ME', 'Civil Eng', 'Chem Eng'];
const SECTIONS = ['1', '2', '3'];

const RegisterPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    login_id: '',
    password: '',
    full_name: '',
    scholar_no: '',
    branch: '',
    section: '',
  });

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.branch || !form.section) {
      toast.error('Please select branch and section');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', form);
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

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
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
                {loading ? <span className="loading loading-spinner loading-sm" /> : 'Register'}
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
