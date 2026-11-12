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
import { flightApi, studentApi } from '../services/crmServices.js';
import { FLIGHT_STATUSES } from '../utils/constants.js';
import { formatDateTime } from '../utils/formatters.js';

export default function FlightsPage() {
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
  const [form, setForm] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await flightApi.list({
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter ? { flight_status: statusFilter } : {})
      });
      setRows(res.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load flights'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, toast]);

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
      flight_status: 'Not Booked',
      airline: '',
      flight_number: '',
      departure_date: '',
      departure_airport: '',
      arrival_airport: '',
      booking_reference: '',
      remarks: ''
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      student_id: row.student_id,
      flight_status: row.flight_status,
      airline: row.airline || '',
      flight_number: row.flight_number || '',
      departure_date: row.departure_date ? String(row.departure_date).slice(0, 16) : '',
      departure_airport: row.departure_airport || '',
      arrival_airport: row.arrival_airport || '',
      booking_reference: row.booking_reference || '',
      remarks: row.remarks || ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.departure_date) {
        payload.departure_date = new Date(payload.departure_date).toISOString();
      }
      if (editing) {
        const { student_id: _omit, ...updates } = payload;
        await flightApi.update(editing.id, updates);
        toast.success('Flight details updated');
      } else {
        await flightApi.create(payload);
        toast.success('Flight record created');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save flight details'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Flight Management</h1>
          <p className="text-sm text-slate-500">Coordinate departure itineraries, airline bookings, and arrival schedules.</p>
        </div>
        {perms.canUpdateTracking && (
          <button type="button" onClick={openCreate} className="btn-primary self-start">
            <Plus className="h-4 w-4" /> Add Flight
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input-field pl-9"
            placeholder="Search by student, ID, or country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-56" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Flight Statuses</option>
          {FLIGHT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading flight bookings..." />
        ) : rows.length === 0 ? (
          <EmptyState title="No flight records found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Flight Status</th>
                  <th className="py-3 px-4">Airline & Flight No.</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Departure Date</th>
                  <th className="py-3 px-4">Booking Ref</th>
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
                    <td className="py-3.5 px-4"><StatusBadge status={r.flight_status} /></td>
                    <td className="py-3.5 px-4 text-xs text-slate-800">
                      {r.airline || '—'} {r.flight_number ? `(${r.flight_number})` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-700">
                      {r.departure_airport || r.arrival_airport ? `${r.departure_airport || '?'} → ${r.arrival_airport || '?'}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{formatDateTime(r.departure_date)}</td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-700">{r.booking_reference || '—'}</td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Update Flight — ${editing.student.full_name}` : 'Add Flight Booking'}>
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
              <label className="label-text">Flight Status</label>
              <select className="input-field" value={form.flight_status || ''} onChange={(e) => setForm((f) => ({ ...f, flight_status: e.target.value }))}>
                {FLIGHT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Airline</label>
              <input className="input-field" value={form.airline || ''} onChange={(e) => setForm((f) => ({ ...f, airline: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Flight Number</label>
              <input className="input-field" placeholder="e.g. EK237" value={form.flight_number || ''} onChange={(e) => setForm((f) => ({ ...f, flight_number: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Departure Date & Time</label>
              <input type="datetime-local" className="input-field" value={form.departure_date || ''} onChange={(e) => setForm((f) => ({ ...f, departure_date: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Departure Airport</label>
              <input className="input-field" placeholder="e.g. BOM" value={form.departure_airport || ''} onChange={(e) => setForm((f) => ({ ...f, departure_airport: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Arrival Airport</label>
              <input className="input-field" placeholder="e.g. MAN" value={form.arrival_airport || ''} onChange={(e) => setForm((f) => ({ ...f, arrival_airport: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label-text">Ticket Booking Reference (PNR)</label>
            <input className="input-field" value={form.booking_reference || ''} onChange={(e) => setForm((f) => ({ ...f, booking_reference: e.target.value }))} />
          </div>
          <div>
            <label className="label-text">Remarks</label>
            <textarea rows={2} className="input-field" value={form.remarks || ''} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Flight'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

