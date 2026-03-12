import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiLogOut, FiMenu, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';

const rolePaths = {
  student:          '/student',
  tpo_admin:        '/admin',
  tpo_volunteer:    '/volunteer',
  tpo_coordinator:  '/coordinator',
};

const roleLabels = {
  student:          'Student',
  tpo_admin:        'TPO Admin',
  tpo_volunteer:    'TPO Volunteer',
  tpo_coordinator:  'TPO Coordinator',
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <div className="navbar bg-primary text-primary-content shadow-lg sticky top-0 z-50">
      <div className="navbar-start">
        <label htmlFor="drawer" className="btn btn-ghost btn-circle drawer-button lg:hidden">
          <FiMenu size={22} />
        </label>
        <Link to={user ? rolePaths[user.role] : '/'} className="btn btn-ghost text-xl font-bold">
          🎓 OA Attend
        </Link>
      </div>

      <div className="navbar-end gap-2">
        {user && (
          <>
            <div className="hidden sm:flex flex-col items-end text-sm">
              <span className="font-semibold">{user.full_name}</span>
              <span className="text-primary-content/70 text-xs">{roleLabels[user.role]}</span>
            </div>
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
                <div className="bg-primary-focus text-primary-content rounded-full w-9 flex items-center justify-center">
                  <FiUser size={18} />
                </div>
              </div>
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 text-base-content rounded-box w-52">
                <li><a className="font-semibold">{user.full_name}</a></li>
                <li><a className="text-xs opacity-60">{roleLabels[user.role]}</a></li>
                <li className="mt-1"><a onClick={handleLogout}><FiLogOut /> Logout</a></li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;
