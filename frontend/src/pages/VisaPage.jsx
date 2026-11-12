import { Edit, ListChecks, Plus, Search, Trash2 } from 'lucide-react';
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
import { visaApi } from '../services/crmServices.js';
import {
  DOCUMENT_VERIFICATION_STATUSES,
  VISA_DOC_STATUSES,
  VISA_ELIGIBILITY_STATUSES
} from '../utils/constants.js';
import { formatDate } from '../utils/formatters.js';

export default function VisaPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [docStatusFilter, setDocStatusFilter] = useState('');
  const [eligFilter, setEligFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [checklistTarget, setChecklistTarget] = useState(null);
  const [checklistItems, setChecklistItems] = useState([]);
  const [newDocName, setNewDocName] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await visaApi.list({
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(docStatusFilter ? { doc_status: docStatusFilter } : {}),
        ...(eligFilter ? { eligibility_status: eligFilter } : {})
      });
      setRows(res.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load visa records'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, docStatusFilter, eligFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEdit = (row) => {
    setSelected(row);
    setForm({
      doc_status: row.doc_status,
      eligibility_status: row.eligibility_status,
      eligibility_remarks: row.eligibility_remarks || '',
      verification_date: row.verification_date || '',
      submission_date: row.submission_date || '',
      visa_reference: row.visa_reference || '',
      remarks: row.remarks || ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await visaApi.updateStatus(selected.id, form);
      toast.success('Visa tracking updated');
      setSelected(null);
      loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update visa status'));
    } finally {
      setSaving(false);
    }
  };

  const openChecklist = async (row) => {
    setChecklistTarget(row);
    try {
      const res = await visaApi.listDocuments(row.id);
      setChecklistItems(res.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load checklist'));
    }
  };

  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    try {
      await visaApi.addDocument(checklistTarget.id, { document_name: newDocName.trim(), is_mandatory: true });
      setNewDocName('');
      const res = await visaApi.listDocuments(checklistTarget.id);
      setChecklistItems(res.data || []);
      toast.success('Visa document item added');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to add item'));
    }
  };

  const handleUpdateChecklistStatus = async (docId, status) => {
    try {
      await visaApi.updateDocument(checklistTarget.id, docId, { status });
      const res = await visaApi.listDocuments(checklistTarget.id);
      setChecklistItems(res.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Update failed'));
    }
  };

  const handleDeleteChecklistItem = async (docId) => {
    try {
      await visaApi.deleteDocument(checklistTarget.id, docId);
      setChecklistItems((prev) => prev.filter((item) => item.id !== docId));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Visa Processing & Eligibility</h1>
        <p className="text-sm text-slate-500">
          Track visa document compilation, eligibility verification, and mandatory document checklists.
        </p>
      </div>

      <div className="card p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input-field pl-9"
            placeholder="Search by student, ID, country, or university..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field lg:w-64" value={docStatusFilter} onChange={(e) => setDocStatusFilter(e.target.value)}>
          <option value="">All Documentation Statuses</option>
          {VISA_DOC_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="input-field lg:w-64" value={eligFilter} onChange={(e) => setEligFilter(e.target.value)}>
          <option value="">All Eligibility Statuses</option>
          {VISA_ELIGIBILITY_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading visa processing queue..." />
        ) : rows.length === 0 ? (
          <EmptyState title="No visa records found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Visa Documentation</th>
                  <th className="py-3 px-4">Visa Eligibility</th>
                  <th className="py-3 px-4">Verified Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
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
                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      <div className="font-medium">{r.student.destination_country}</div>
                      <div className="text-slate-500">{r.student.university_name}</div>
                    </td>
                    <td className="py-3.5 px-4"><StatusBadge status={r.doc_status} /></td>
                    <td className="py-3.5 px-4"><StatusBadge status={r.eligibility_status} /></td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{formatDate(r.verification_date)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button type="button" onClick={() => openChecklist(r)} className="btn-secondary px-2.5 py-1.5 text-xs">
                          <ListChecks className="h-3.5 w-3.5" /> Checklist
                        </button>
                        {perms.canUpdateTracking && (
                          <button type="button" onClick={() => openEdit(r)} className="btn-secondary px-2.5 py-1.5 text-xs">
                            <Edit className="h-3.5 w-3.5" /> Update
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Visa Status Modal */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Update Visa Status — ${selected?.student?.full_name || ''}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-text">Visa Documentation Status</label>
              <select className="input-field" value={form.doc_status || ''} onChange={(e) => setForm((f) => ({ ...f, doc_status: e.target.value }))}>
                {VISA_DOC_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Visa Eligibility Status</label>
              <select className="input-field" value={form.eligibility_status || ''} onChange={(e) => setForm((f) => ({ ...f, eligibility_status: e.target.value }))}>
                {VISA_ELIGIBILITY_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Verification Date</label>
              <input type="date" className="input-field" value={form.verification_date || ''} onChange={(e) => setForm((f) => ({ ...f, verification_date: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Submission Date</label>
              <input type="date" className="input-field" value={form.submission_date || ''} onChange={(e) => setForm((f) => ({ ...f, submission_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label-text">Visa Reference Number</label>
            <input className="input-field" value={form.visa_reference || ''} onChange={(e) => setForm((f) => ({ ...f, visa_reference: e.target.value }))} />
          </div>
          <div>
            <label className="label-text">Eligibility Remarks</label>
            <textarea rows={2} className="input-field" value={form.eligibility_remarks || ''} onChange={(e) => setForm((f) => ({ ...f, eligibility_remarks: e.target.value }))} />
          </div>
          <div>
            <label className="label-text">Processing Remarks</label>
            <textarea rows={2} className="input-field" value={form.remarks || ''} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setSelected(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Visa Document Checklist Modal */}
      <Modal
        open={Boolean(checklistTarget)}
        onClose={() => setChecklistTarget(null)}
        title={`Visa Document Checklist — ${checklistTarget?.student?.full_name || ''}`}
      >
        <div className="space-y-4">
          {perms.canUpdateTracking && (
            <form onSubmit={handleAddChecklistItem} className="flex gap-2">
              <input
                className="input-field flex-1"
                placeholder="Add required visa item (e.g. Bank Solvency Letter)"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
              />
              <button type="submit" className="btn-primary">
                <Plus className="h-4 w-4" /> Add
              </button>
            </form>
          )}
          {checklistItems.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-6">No checklist items added yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {checklistItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.document_name}</p>
                    <StatusBadge status={item.status} className="mt-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    {perms.canUpdateTracking && (
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateChecklistStatus(item.id, e.target.value)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      >
                        {DOCUMENT_VERIFICATION_STATUSES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    )}
                    {perms.canDeleteDocument && (
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

