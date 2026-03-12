import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-2xl">
        <div className="card-body">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎓</div>
            <h1 className="text-3xl font-bold text-primary">OA Attendance</h1>
            <p className="text-base-content/60 mt-1">Online Assessment Attendance System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">Login ID</span></label>
              <div className="input input-bordered flex items-center gap-2">
                <FiUser className="text-base-content/40" />
                <input
                  type="text"
                  placeholder="Enter your login ID"
                  className="grow"
                  value={form.login_id}
                  onChange={e => setForm(p => ({ ...p, login_id: e.target.value }))}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text font-semibold">Password</span></label>
              <div className="input input-bordered flex items-center gap-2">
                <FiLock className="text-base-content/40" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="grow"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(p => !p)} className="text-base-content/40">
                  {showPass ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Sign In'}
            </button>
          </form>

          <div className="divider text-xs text-base-content/40">New student?</div>
          <Link to="/register" className="btn btn-outline btn-primary w-full">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
