import { KeyRound, Save, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePermissions } from '../hooks/usePermissions.js';
import { getApiErrorMessage } from '../services/api.js';
import { authApi, settingsApi } from '../services/crmServices.js';
import { ROLE_LABELS } from '../utils/constants.js';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const perms = usePermissions();

  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [savingSettings, setSavingSettings] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    settingsApi
      .get()
      .then((res) => {
        const s = res.data || {};
        setOrgName(s.organization_name || 'AvomaxCRM');
        setCurrency(s.default_currency || 'USD');
        setAcademicYear(s.active_academic_year || '2026-2027');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await settingsApi.update({
        organization_name: orgName,
        default_currency: currency,
        active_academic_year: academicYear
      });
      toast.success('System settings saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSavingPw(true);
    try {
      await authApi.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      toast.success('Password updated successfully');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Password update failed'));
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading settings..." />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings & Security</h1>
        <p className="text-sm text-slate-500">Manage account security and global CRM configuration.</p>
      </div>

      {/* Account Info */}
      <div className="card p-5 space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">Signed-in Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
          <div>
            <span className="text-slate-400 block">Full Name</span>
            <span className="font-medium text-slate-800">{user?.full_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Email</span>
            <span className="font-medium text-slate-800">{user?.email}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Access Role</span>
            <span className="font-semibold text-indigo-600">{ROLE_LABELS[user?.role] || user?.role}</span>
          </div>
        </div>
      </div>

      {/* System Settings (Super Admin) */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">System Configuration</h2>
          {!perms.canManageSettings && (
            <span className="text-xs text-slate-400 ml-auto">Editable by Super Admin only</span>
          )}
        </div>
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label-text">Organization Name</label>
              <input
                className="input-field"
                disabled={!perms.canManageSettings}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div>
              <label className="label-text">Default Currency</label>
              <input
                className="input-field"
                disabled={!perms.canManageSettings}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="label-text">Active Academic Year</label>
              <input
                className="input-field"
                disabled={!perms.canManageSettings}
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            </div>
          </div>
          {perms.canManageSettings && (
            <button type="submit" disabled={savingSettings} className="btn-primary">
              <Save className="h-4 w-4" /> {savingSettings ? 'Saving...' : 'Save Configuration'}
            </button>
          )}
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Change Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="label-text">Current Password</label>
            <input
              type="password"
              required
              className="input-field"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className="label-text">New Password (min 8 chars, 1 uppercase, 1 number)</label>
            <input
              type="password"
              required
              className="input-field"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            />
          </div>
          <button type="submit" disabled={savingPw} className="btn-secondary">
            {savingPw ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

