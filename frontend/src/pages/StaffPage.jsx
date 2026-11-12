import { Edit, Plus, UserCheck, UserX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import EmptyState from '../components/ui/EmptyState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePermissions } from '../hooks/usePermissions.js';
import { getApiErrorMessage } from '../services/api.js';
import { staffApi } from '../services/crmServices.js';
import { ROLE_LABELS } from '../utils/constants.js';
import { formatDateTime } from '../utils/formatters.js';

const ROLE_BADGE_COLORS = {
  super_admin: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  counselor: 'bg-sky-50 text-sky-700 border-sky-200',
  viewer: 'bg-slate-100 text-slate-600 border-slate-200'
};

export default function StaffPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'counselor',
    phone: '',
    department: '',
    is_active: true
  });

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffApi.list();
      setStaff(res.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load staff'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      full_name: '',
      email: '',
      password: '',
      role: 'counselor',
      phone: '',
      department: '',
      is_active: true
    });
    setModalOpen(true);
  };

  const openEdit = (member) => {
    setEditing(member);
    setForm({
      full_name: member.full_name,
      email: member.email,
      password: '',
      role: member.role,
      phone: member.phone || '',
      department: member.department || '',
      is_active: member.is_active
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const payload = {
          full_name: form.full_name,
          role: form.role,
          phone: form.phone,
          department: form.department,
          is_active: form.is_active
        };
        if (form.password) payload.password = form.password;
        await staffApi.update(editing.id, payload);
        toast.success('Staff member updated');
      } else {
        await staffApi.create(form);
        toast.success('Staff account created');
      }
      setModalOpen(false);
      loadStaff();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save staff account'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff Management</h1>
          <p className="text-sm text-slate-500">
            Manage Super Admins, Admins, Counselors, and Read-Only Viewers.
          </p>
        </div>
        {perms.canManageStaff && (
          <button type="button" onClick={openCreate} className="btn-primary self-start">
            <Plus className="h-4 w-4" /> Add Staff Member
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading staff directory..." />
        ) : staff.length === 0 ? (
          <EmptyState title="No staff members found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  {perms.canManageStaff && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {staff.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{m.full_name}</div>
                      <div className="text-xs text-slate-500">{m.email} {m.phone ? `• ${m.phone}` : ''}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE_COLORS[m.role] || ''}`}>
                        {ROLE_LABELS[m.role] || m.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{m.department || '—'}</td>
                    <td className="py-3.5 px-4">
                      {m.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <UserCheck className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                          <UserX className="h-3.5 w-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{formatDateTime(m.last_login_at)}</td>
                    {perms.canManageStaff && (
                      <td className="py-3.5 px-4 text-right">
                        <button type="button" onClick={() => openEdit(m)} className="btn-secondary px-3 py-1.5 text-xs">
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit Staff — ${editing.full_name}` : 'Create Staff Account'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Full Name *</label>
              <input className="input-field" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required />
            </div>
            <div>
              <label className="label-text">Email *</label>
              <input type="email" className="input-field" disabled={Boolean(editing)} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label-text">Role *</label>
              <select className="input-field" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {Object.entries(ROLE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">{editing ? 'New Password (optional)' : 'Password * (min 8 chars, upper + number)'}</label>
              <input
                type="password"
                className="input-field"
                required={!editing}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div>
              <label className="label-text">Department</label>
              <input className="input-field" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Phone</label>
              <input className="input-field" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Account Active
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Staff'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

