import {
  Download,
  Edit,
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import StudentFormModal from '../features/students/StudentFormModal.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { getApiErrorMessage } from '../services/api.js';
import { staffApi, studentApi, triggerBlobDownload } from '../services/crmServices.js';
import {
  ACCOMMODATION_PAYMENT_STATUSES,
  ACCOMMODATION_REQUIREMENTS,
  ADMISSION_STATUSES,
  FEE_STATUSES,
  FLIGHT_STATUSES,
  VISA_DOC_STATUSES,
  VISA_ELIGIBILITY_STATUSES
} from '../utils/constants.js';

const INITIAL_FILTERS = {
  admission_status: '',
  fee_status: '',
  visa_doc_status: '',
  visa_eligibility_status: '',
  flight_status: '',
  accommodation_requirement: '',
  accommodation_payment_status: '',
  destination_country: '',
  university_name: '',
  intake: '',
  assigned_counselor_id: ''
};

export default function StudentsPage() {
  const { toast } = useToast();
  const perms = usePermissions();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(search, 300);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [counselors, setCounselors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    staffApi
      .counselors()
      .then((res) => setCounselors(res.data || []))
      .catch(() => {});
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const res = await studentApi.list({
        page,
        limit: 15,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...cleanFilters
      });
      setStudents(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to fetch students'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filters, toast]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleSaveStudent = async (values) => {
    setSaving(true);
    try {
      if (editingStudent) {
        await studentApi.update(editingStudent.id, values);
        toast.success('Student updated successfully');
      } else {
        await studentApi.create(values);
        toast.success('Student registered successfully');
      }
      setModalOpen(false);
      setEditingStudent(null);
      loadStudents();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save student'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Archive student ${student.full_name} (${student.student_code})?`)) return;
    try {
      await studentApi.remove(student.id);
      toast.success('Student archived');
      loadStudents();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to archive student'));
    }
  };

  const handleExport = async (format) => {
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const blob = await studentApi.exportFile({
        format,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...cleanFilters
      });
      triggerBlobDownload(blob, `students_export.${format}`);
      toast.success(`Exported ${format.toUpperCase()} file`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Export failed'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students Directory</h1>
          <p className="text-sm text-slate-500">
            Manage international student applications, progress stages, and counselor assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => handleExport('csv')} className="btn-secondary text-xs">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button type="button" onClick={() => handleExport('xlsx')} className="btn-secondary text-xs">
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
          {perms.canCreateStudent && (
            <button
              type="button"
              onClick={() => {
                setEditingStudent(null);
                setModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> Add Student
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Student ID, full name, email, phone, or passport..."
              className="input-field pl-9"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`btn-secondary ${activeFilterCount > 0 ? 'border-indigo-400 bg-indigo-50/50 text-indigo-700' : ''}`}
          >
            <Filter className="h-4 w-4" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilters(INITIAL_FILTERS);
                setPage(1);
              }}
              className="btn-secondary text-rose-600"
            >
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="label-text">Admission Status</label>
              <select
                className="input-field"
                value={filters.admission_status}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, admission_status: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {ADMISSION_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Admission Fee Status</label>
              <select
                className="input-field"
                value={filters.fee_status}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, fee_status: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {FEE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Visa Documentation</label>
              <select
                className="input-field"
                value={filters.visa_doc_status}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, visa_doc_status: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {VISA_DOC_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Visa Eligibility</label>
              <select
                className="input-field"
                value={filters.visa_eligibility_status}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, visa_eligibility_status: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {VISA_ELIGIBILITY_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Flight Booking</label>
              <select
                className="input-field"
                value={filters.flight_status}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, flight_status: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {FLIGHT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Accommodation Type</label>
              <select
                className="input-field"
                value={filters.accommodation_requirement}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, accommodation_requirement: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {ACCOMMODATION_REQUIREMENTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Accommodation Payment</label>
              <select
                className="input-field"
                value={filters.accommodation_payment_status}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, accommodation_payment_status: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {ACCOMMODATION_PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Assigned Counselor</label>
              <select
                className="input-field"
                value={filters.assigned_counselor_id}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, assigned_counselor_id: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">All Counselors</option>
                {counselors.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Destination Country</label>
              <input
                className="input-field"
                placeholder="e.g. United Kingdom"
                value={filters.destination_country}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, destination_country: e.target.value }));
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="label-text">University</label>
              <input
                className="input-field"
                placeholder="e.g. Manchester"
                value={filters.university_name}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, university_name: e.target.value }));
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="label-text">Intake</label>
              <input
                className="input-field"
                placeholder="e.g. Fall 2026"
                value={filters.intake}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, intake: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading students..." />
        ) : students.length === 0 ? (
          <EmptyState
            title="No matching students"
            description="Adjust your search or filters, or register a new international student."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Destination & University</th>
                    <th className="py-3 px-4">Admission</th>
                    <th className="py-3 px-4">Fee</th>
                    <th className="py-3 px-4">Visa Eligibility</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Counselor</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link to={`/students/${s.id}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                          {s.full_name}
                        </Link>
                        <div className="text-xs text-slate-500">
                          {s.student_code} • {s.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{s.university_name}</div>
                        <div className="text-xs text-slate-500">
                          {s.destination_country} • {s.intake}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={s.admission?.status || 'Application Pending'} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={s.latest_payment?.payment_status || 'Pending'} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={s.visa?.eligibility_status || 'Not Evaluated'} />
                      </td>
                      <td className="py-3.5 px-4 min-w-[130px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all"
                              style={{ width: `${s.progress?.overallPercentage || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            {s.progress?.overallPercentage || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {s.counselor?.full_name || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/students/${s.id}`}
                            title="View Profile"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {perms.canEditStudent && (
                            <button
                              type="button"
                              title="Edit Student"
                              onClick={() => {
                                setEditingStudent(s);
                                setModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {perms.canDeleteStudent && (
                            <button
                              type="button"
                              title="Archive Student"
                              onClick={() => handleDelete(s)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      <StudentFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={handleSaveStudent}
        student={editingStudent}
        counselors={counselors}
        saving={saving}
      />
    </div>
  );
}

