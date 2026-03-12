import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';

const BRANCHES = ['CS', 'IT', 'ECE', 'EE', 'ME', 'CE', 'CH'];
const SECTIONS = ['A', 'B', 'C', 'D', 'E'];

const RegisterPage = () => {
  const navigate = useNavigate();
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

  const handleSubmit = async (e) => {
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg bg-base-100 shadow-2xl">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/login" className="btn btn-ghost btn-circle btn-sm"><FiArrowLeft /></Link>
            <div>
              <h2 className="text-2xl font-bold text-primary">Student Registration</h2>
              <p className="text-base-content/60 text-sm">Create your account to track OA attendance</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-control sm:col-span-2">
                <label className="label"><span className="label-text font-semibold">Full Name</span></label>
                <input type="text" placeholder="e.g. Rahul Kumar" className="input input-bordered"
                  value={form.full_name} onChange={set('full_name')} required minLength={2} />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Scholar No.</span></label>
                <input type="text" placeholder="e.g. 0901CS21001" className="input input-bordered"
                  value={form.scholar_no} onChange={set('scholar_no')} required />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Login ID</span></label>
                <input type="text" placeholder="Choose a login ID" className="input input-bordered"
                  value={form.login_id} onChange={set('login_id')} required minLength={3} />
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
                <div className="input input-bordered flex items-center gap-2">
                  <input type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" className="grow"
                    value={form.password} onChange={set('password')} required minLength={6} />
                  <button type="button" onClick={() => setShowPass(p => !p)} className="text-base-content/40">
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            </div>

            <div className="alert alert-info text-sm">
              <span>📸 After registration, you'll need to register your face for attendance verification.</span>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
