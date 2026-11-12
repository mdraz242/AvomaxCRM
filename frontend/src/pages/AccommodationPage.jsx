import { Edit, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { getApiErrorMessage } from '../services/api.js';
import { accommodationApi, studentApi } from '../services/crmServices.js';
import { ACCOMMODATION_PAYMENT_STATUSES, ACCOMMODATION_REQUIREMENTS } from '../utils/constants.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export default function AccommodationPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [reqFilter, setReqFilter] = useState('');
  const [payFilter, setPayFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accommodationApi.list({
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(reqFilter ? { requirement_status: reqFilter } : {}),
        ...(payFilter ? { payment_status: payFilter } : {})
      });
      setRows(res.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load accommodations'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, reqFilter, payFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (perms.canUpdateTracking) {
      studentApi.list({ limit: 100 }).then((r) => setStudents(r.data || [])).catch(() => {});
    }
  }, [perms.canUpdateTracking]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      student_id: '',
      requirement_status: 'Hostel Required',
      payment_status: 'Paid Upon Arrival',
      provider: '',
      property_name: '',
      address: '',
      check_in_date: '',
      check_out_date: '',
      payment_amount: 0,
      currency: 'USD',
      booking_confirmation: '',
      remarks: ''
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      student_id: row.student_id,
      requirement_status: row.requirement_status,
      payment_status: row.payment_status,
      provider: row.provider || '',
      property_name: row.property_name || '',
      address: row.address || '',
      check_in_date: row.check_in_date || '',
      check_out_date: row.check_out_date || '',
      payment_amount: row.payment_amount ?? 0,
      currency: row.currency || 'USD',
      booking_confirmation: row.booking_confirmation || '',
      remarks: row.remarks || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const { student_id: _omit, ...updates } = form;
        await accommodationApi.update(editing.id, updates);
        toast.success('Accommodation updated');
      } else {
        await accommodationApi.create(form);
        toast.success('Accommodation record created');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save accommodation'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Accommodation Management</h1>
          <p className="text-sm text-slate-500">Manage university hostels, off-campus housing reservations, and check-in dates.</p>
        </div>
        {perms.canUpdateTracking && (
          <button type="button" onClick={openCreate} className="btn-primary self-start">
            <Plus className="h-4 w-4" /> Add Accommodation
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input-field pl-9"
            placeholder="Search by student, ID, or country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field lg:w-64" value={reqFilter} onChange={(e) => setReqFilter(e.target.value)}>
          <option value="">All Accommodation Types</option>
          {ACCOMMODATION_REQUIREMENTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="input-field lg:w-52" value={payFilter} onChange={(e) => setPayFilter(e.target.value)}>
          <option value="">All Payment Types</option>
          {ACCOMMODATION_PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading accommodations..." />
        ) : rows.length === 0 ? (
          <EmptyState title="No accommodation records found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Requirement Status</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Property & Provider</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <Link to={`/students/${r.student.id}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                        {r.student.full_name}
                      </Link>
                      <div className="text-xs text-slate-500">{r.student.student_code} • {r.student.destination_country}</div>
                    </td>
                    <td className="py-3.5 px-4"><StatusBadge status={r.requirement_status} /></td>
                    <td className="py-3.5 px-4"><StatusBadge status={r.payment_status} /></td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-medium text-slate-800">{r.property_name || '—'}</div>
                      <div className="text-slate-500">{r.provider || ''}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {r.check_in_date ? `${formatDate(r.check_in_date)} → ${formatDate(r.check_out_date)}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">{formatCurrency(r.payment_amount, r.currency)}</td>
                    <td className="py-3.5 px-4 text-right">
                      {perms.canUpdateTracking && (
                        <button type="button" onClick={() => openEdit(r)} className="btn-secondary px-3 py-1.5 text-xs">
                          <Edit className="h-3.5 w-3.5" /> Update
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Update Accommodation — ${editing.student.full_name}` : 'Add Accommodation'}>
        <form onSubmit={handleSave} className="space-y-4">
          {!editing && (
            <div>
              <label className="label-text">Student *</label>
              <select className="input-field" value={form.student_id || ''} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))} required>
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.student_code} — {s.full_name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Accommodation Requirement</label>
              <select className="input-field" value={form.requirement_status || ''} onChange={(e) => setForm((f) => ({ ...f, requirement_status: e.target.value }))}>
                {ACCOMMODATION_REQUIREMENTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Payment Status</label>
              <select className="input-field" value={form.payment_status || ''} onChange={(e) => setForm((f) => ({ ...f, payment_status: e.target.value }))}>
                {ACCOMMODATION_PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Accommodation Provider</label>
              <input className="input-field" value={form.provider || ''} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Property / Hostel Name</label>
              <input className="input-field" value={form.property_name || ''} onChange={(e) => setForm((f) => ({ ...f, property_name: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Check-in Date</label>
              <input type="date" className="input-field" value={form.check_in_date || ''} onChange={(e) => setForm((f) => ({ ...f, check_in_date: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Check-out Date</label>
              <input type="date" className="input-field" value={form.check_out_date || ''} onChange={(e) => setForm((f) => ({ ...f, check_out_date: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Payment Amount</label>
              <input type="number" step="0.01" min="0" className="input-field" value={form.payment_amount ?? 0} onChange={(e) => setForm((f) => ({ ...f, payment_amount: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Booking Confirmation Code</label>
              <input className="input-field" value={form.booking_confirmation || ''} onChange={(e) => setForm((f) => ({ ...f, booking_confirmation: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label-text">Address</label>
            <input className="input-field" value={form.address || ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label className="label-text">Accommodation Remarks</label>
            <textarea rows={2} className="input-field" value={form.remarks || ''} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Accommodation'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

