import { Edit, Search } from 'lucide-react';
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
import { admissionApi } from '../services/crmServices.js';
import { ADMISSION_STATUSES } from '../utils/constants.js';
import { formatDate } from '../utils/formatters.js';

export default function AdmissionsPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ status: '', offer_reference: '', offer_received_date: '', decision_date: '', remarks: '' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await admissionApi.list({
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter ? { status: statusFilter } : {})
      });
      setRows(res.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load admissions'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEdit = (row) => {
    setSelected(row);
    setForm({
      status: row.status,
      offer_reference: row.offer_reference || '',
      offer_received_date: row.offer_received_date || '',
      decision_date: row.decision_date || '',
      remarks: row.remarks || ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await admissionApi.updateStatus(selected.id, form);
      toast.success('Admission status updated');
      setSelected(null);
      loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admissions Tracking</h1>
        <p className="text-sm text-slate-500">Monitor university offers, conditions, and admission confirmations.</p>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input-field pl-9"
            placeholder="Search by student, ID, university, or country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-64" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Admission Statuses</option>
          {ADMISSION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading admissions..." />
        ) : rows.length === 0 ? (
          <EmptyState title="No admission records found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">University & Course</th>
                  <th className="py-3 px-4">Admission Status</th>
                  <th className="py-3 px-4">Offer Ref</th>
                  <th className="py-3 px-4">Offer Date</th>
                  <th className="py-3 px-4">Updated By</th>
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
                      <div className="text-xs text-slate-500">{r.student.student_code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{r.student.university_name}</div>
                      <div className="text-xs text-slate-500">{r.student.course_name} • {r.student.destination_country}</div>
                    </td>
                    <td className="py-3.5 px-4"><StatusBadge status={r.status} /></td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-700">{r.offer_reference || '—'}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{formatDate(r.offer_received_date)}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{r.updated_by_profile?.full_name || '—'}</td>
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

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Update Admission — ${selected?.student?.full_name || ''}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label-text">Admission Status *</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {ADMISSION_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label-text">Offer Reference</label>
              <input className="input-field" value={form.offer_reference} onChange={(e) => setForm((f) => ({ ...f, offer_reference: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Offer Received Date</label>
              <input type="date" className="input-field" value={form.offer_received_date} onChange={(e) => setForm((f) => ({ ...f, offer_received_date: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Decision Date</label>
              <input type="date" className="input-field" value={form.decision_date} onChange={(e) => setForm((f) => ({ ...f, decision_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label-text">Remarks</label>
            <textarea rows={3} className="input-field" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setSelected(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Status'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

