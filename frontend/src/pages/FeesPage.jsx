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
import { paymentApi, studentApi } from '../services/crmServices.js';
import { FEE_STATUSES } from '../utils/constants.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export default function FeesPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    payment_status: 'Pending',
    currency: 'USD',
    total_fee: 0,
    amount_paid: 0,
    payment_date: '',
    payment_reference: '',
    remarks: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentApi.list({
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter ? { payment_status: statusFilter } : {})
      });
      setRows(res.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load fee payments'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (perms.canManagePayments) {
      studentApi.list({ limit: 100 }).then((r) => setStudents(r.data || [])).catch(() => {});
    }
  }, [perms.canManagePayments]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      student_id: '',
      payment_status: 'Pending',
      currency: 'USD',
      total_fee: 0,
      amount_paid: 0,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_reference: '',
      remarks: ''
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      student_id: row.student_id,
      payment_status: row.payment_status,
      currency: row.currency || 'USD',
      total_fee: row.total_fee ?? 0,
      amount_paid: row.amount_paid ?? 0,
      payment_date: row.payment_date || '',
      payment_reference: row.payment_reference || '',
      remarks: row.remarks || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const { student_id: _omit, ...payload } = form;
        await paymentApi.update(editing.id, payload);
        toast.success('Fee payment updated');
      } else {
        await paymentApi.create(form);
        toast.success('Fee payment recorded');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save fee payment'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admission Fee Management</h1>
          <p className="text-sm text-slate-500">Track tuition deposits, partial payments, waivers, and outstanding balances.</p>
        </div>
        {perms.canManagePayments && (
          <button type="button" onClick={openCreate} className="btn-primary self-start">
            <Plus className="h-4 w-4" /> Record Payment
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input-field pl-9"
            placeholder="Search by student, ID, or university..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-56" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Payment Statuses</option>
          {FEE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading fee records..." />
        ) : rows.length === 0 ? (
          <EmptyState title="No fee records found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Total Fee</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Outstanding</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date & Ref</th>
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
                      <div className="text-xs text-slate-500">{r.student.student_code} • {r.student.university_name}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium">{formatCurrency(r.total_fee, r.currency)}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-medium">{formatCurrency(r.amount_paid, r.currency)}</td>
                    <td className="py-3.5 px-4 text-rose-600 font-semibold">{formatCurrency(r.outstanding_amount, r.currency)}</td>
                    <td className="py-3.5 px-4"><StatusBadge status={r.payment_status} /></td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div>{formatDate(r.payment_date)}</div>
                      <div className="font-mono text-slate-400">{r.payment_reference || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {perms.canManagePayments && (
                        <button type="button" onClick={() => openEdit(r)} className="btn-secondary px-3 py-1.5 text-xs">
                          <Edit className="h-3.5 w-3.5" /> Edit
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Fee Payment — ${editing.student.full_name}` : 'Record Admission Fee Payment'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {!editing && (
            <div>
              <label className="label-text">Student *</label>
              <select
                className="input-field"
                value={form.student_id}
                onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
                required
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.student_code} — {s.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Payment Status *</label>
              <select className="input-field" value={form.payment_status} onChange={(e) => setForm((f) => ({ ...f, payment_status: e.target.value }))}>
                {FEE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Currency</label>
              <input className="input-field" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="label-text">Total Admission Fee</label>
              <input type="number" step="0.01" min="0" className="input-field" value={form.total_fee} onChange={(e) => setForm((f) => ({ ...f, total_fee: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Amount Paid</label>
              <input type="number" step="0.01" min="0" className="input-field" value={form.amount_paid} onChange={(e) => setForm((f) => ({ ...f, amount_paid: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Payment Date</label>
              <input type="date" className="input-field" value={form.payment_date} onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Payment Reference Number</label>
              <input className="input-field" value={form.payment_reference} onChange={(e) => setForm((f) => ({ ...f, payment_reference: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label-text">Remarks</label>
            <textarea rows={2} className="input-field" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Payment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

