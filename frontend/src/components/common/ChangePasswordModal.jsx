import { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiLock, FiEye, FiEyeOff, FiX } from 'react-icons/fi';

const ChangePasswordModal = ({ onClose }) => {
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      return toast.error('New passwords do not match');
    }
    if (form.new_password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      await api.patch('/auth/change-password', {
        old_password: form.old_password,
        new_password: form.new_password,
      });
      toast.success('Password changed successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog open className="modal modal-open modal-bottom sm:modal-middle">
      <div className="modal-box glass-card max-w-md">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
          onClick={onClose}
        >
          <FiX size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl profile-gradient flex items-center justify-center">
            <FiLock size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Change Password</h3>
            <p className="text-base-content/50 text-sm">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text font-semibold">Current Password</span></label>
            <div className="input input-bordered input-premium flex items-center gap-2">
              <FiLock className="text-base-content/40" />
              <input
                type={showOld ? 'text' : 'password'}
                placeholder="Enter current password"
                className="grow"
                value={form.old_password}
                onChange={e => setForm(p => ({ ...p, old_password: e.target.value }))}
                required
              />
              <button type="button" onClick={() => setShowOld(p => !p)} className="text-base-content/40 hover:text-base-content">
                {showOld ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-semibold">New Password</span></label>
            <div className="input input-bordered input-premium flex items-center gap-2">
              <FiLock className="text-base-content/40" />
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="Min 6 characters"
                className="grow"
                value={form.new_password}
                onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowNew(p => !p)} className="text-base-content/40 hover:text-base-content">
                {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-semibold">Confirm New Password</span></label>
            <div className="input input-bordered input-premium flex items-center gap-2">
              <FiLock className="text-base-content/40" />
              <input
                type="password"
                placeholder="Re-enter new password"
                className="grow"
                value={form.confirm_password}
                onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-gradient flex-1" disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose} />
    </dialog>
  );
};

export default ChangePasswordModal;
