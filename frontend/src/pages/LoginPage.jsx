import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';

const rolePaths = {
  student:         '/student',
  tpo_admin:       '/admin',
  tpo_volunteer:   '/volunteer',
  tpo_coordinator: '/coordinator',
};

const LoginPage = () => {
  const { login } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login_id: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form);
      toast.success(`Welcome, ${user.full_name}!`);
      navigate(rolePaths[user.role] || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${isDark ? 'gradient-bg-dark' : 'gradient-bg-light'}`}>
      {/* Floating decorative shapes */}
      <div className="floating-shape w-72 h-72 bg-primary animate-float -top-20 -left-20" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }} />
      <div className="floating-shape w-96 h-96 bg-secondary animate-float-delay -bottom-32 -right-32" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }} />
      <div className="floating-shape w-40 h-40 bg-accent animate-float top-1/4 right-1/4" style={{ borderRadius: '40% 60% 60% 40% / 50% 40% 60% 50%' }} />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="glass-card p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3 animate-float inline-block">🎓</div>
            <h1 className="text-3xl font-extrabold text-gradient">OA Attendance</h1>
            <p className="text-base-content/50 mt-2 text-sm">Online Assessment Attendance System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">Login ID</span></label>
              <div className="input input-bordered input-premium flex items-center gap-2">
                <FiUser className="text-base-content/40 shrink-0" />
                <input
                  type="text"
                  placeholder="Enter your login ID"
                  className="grow bg-transparent outline-none"
                  value={form.login_id}
                  onChange={e => setForm(p => ({ ...p, login_id: e.target.value }))}
                  required
                  autoComplete="username"
                  id="login-id-input"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">Password</span></label>
              <div className="input input-bordered input-premium flex items-center gap-2">
                <FiLock className="text-base-content/40 shrink-0" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="grow bg-transparent outline-none"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                  id="login-password-input"
                />
                <button type="button" onClick={() => setShowPass(p => !p)} className="text-base-content/40 hover:text-base-content transition-colors">
                  {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-gradient w-full mt-3 h-12 text-base" disabled={loading} id="login-submit-btn">
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-base-content/10" />
            <span className="text-xs text-base-content/40">New student?</span>
            <div className="flex-1 h-px bg-base-content/10" />
          </div>

          <Link to="/register" className="btn btn-outline btn-primary w-full h-11" id="register-link-btn">
            Create Account
          </Link>
        </div>

        <p className="text-center text-xs text-base-content/30 mt-6">
          © {new Date().getFullYear()} OA Attendance System
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
