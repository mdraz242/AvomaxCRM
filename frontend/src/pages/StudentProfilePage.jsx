import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  Upload,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  DocumentPreviewModal,
  DocumentUploadModal,
  DocumentVersionsModal
} from '../features/documents/DocumentModals.jsx';
import { usePermissions } from '../hooks/usePermissions.js';
import { getApiErrorMessage } from '../services/api.js';
import { documentApi, studentApi } from '../services/crmServices.js';
import { DOCUMENT_VERIFICATION_STATUSES } from '../utils/constants.js';
import { formatCurrency, formatDate, formatDateTime, formatFileSize } from '../utils/formatters.js';

function StageIcon({ state }) {
  if (state === 'completed') return <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />;
  if (state === 'blocked') return <XCircle className="h-5 w-5 text-rose-600 shrink-0" />;
  if (state === 'in_progress') return <Clock className="h-5 w-5 text-sky-600 shrink-0" />;
  return <AlertCircle className="h-5 w-5 text-slate-400 shrink-0" />;
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const { toast } = useToast();
  const perms = usePermissions();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [versionTarget, setVersionTarget] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [versionsDoc, setVersionsDoc] = useState(null);

  const loadStudent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentApi.get(id);
      setStudent(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load student profile'));
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  const handleDownload = async (docId) => {
    try {
      const res = await documentApi.getSignedUrl(docId, true);
      window.open(res.data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to download document'));
    }
  };

  const handleVerifyDoc = async (docId, status) => {
    try {
      await documentApi.verify(docId, { verification_status: status });
      toast.success(`Document marked as ${status}`);
      loadStudent();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Verification update failed'));
    }
  };

  if (loading) return <LoadingSpinner label="Loading student dossier..." />;
  if (!student) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-slate-600">Student record not found or access denied.</p>
        <Link to="/students" className="btn-secondary mt-4">Back to Students</Link>
      </div>
    );
  }

  const { progress, admission, latest_payment: payment, visa, latest_flight: flight, latest_accommodation: accommodation } = student;
  const latestDocs = (student.documents || []).filter((d) => d.is_latest);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link to="/students" className="mt-1 rounded-lg p-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900">{student.full_name}</h1>
              <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-semibold text-slate-700">
                {student.student_code}
              </span>
              <StatusBadge status={admission?.status || 'Application Pending'} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {student.university_name} ({student.destination_country}) • {student.course_name} • {student.intake} ({student.academic_year})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium text-slate-500">Overall Completion</p>
            <p className="text-xl font-bold text-indigo-600">
              {progress?.overallPercentage || 0}%{' '}
              <span className="text-xs font-normal text-slate-500">
                ({progress?.completedCount || 0}/{progress?.totalStages || 6} stages)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 6-Stage Visual Progress Tracker */}
      <div className="card p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">6-Stage Student Journey Tracker</h2>
            <p className="text-xs text-slate-500">
              Progress advances strictly on completed stages. In-progress stages remain pending until finalized.
            </p>
          </div>
          <div className="w-full sm:w-64">
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${progress?.overallPercentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(progress?.stages || []).map((stage) => (
            <div
              key={stage.key}
              className={`rounded-xl border p-4 transition-colors ${
                stage.completed
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : stage.state === 'blocked'
                    ? 'border-rose-200 bg-rose-50/30'
                    : stage.state === 'in_progress'
                      ? 'border-sky-200 bg-sky-50/30'
                      : 'border-slate-200 bg-slate-50/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StageIcon state={stage.state} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Stage {stage.step}
                    </p>
                    <h3 className="text-sm font-semibold text-slate-900">{stage.label}</h3>
                  </div>
                </div>
                <StatusBadge status={stage.status} />
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-1 text-xs text-slate-600">
                <p>
                  <span className="text-slate-400">Responsible:</span>{' '}
                  <span className="font-medium text-slate-800">{stage.responsibleStaff}</span>
                </p>
                <p>
                  <span className="text-slate-400">Last Updated:</span>{' '}
                  <span>{stage.lastUpdated ? formatDateTime(stage.lastUpdated) : 'Not updated yet'}</span>
                </p>
                {stage.remarks && (
                  <p className="text-slate-600 line-clamp-2">
                    <span className="text-slate-400">Remarks:</span> {stage.remarks}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-3">
            <span className="font-semibold text-emerald-800">Completed Stages ({progress?.completedStages?.length || 0}): </span>
            <span className="text-emerald-700">
              {progress?.completedStages?.length ? progress.completedStages.join(', ') : 'None yet'}
            </span>
          </div>
          <div className="rounded-lg bg-slate-100 border border-slate-200 p-3">
            <span className="font-semibold text-slate-800">Pending Stages ({progress?.pendingStages?.length || 0}): </span>
            <span className="text-slate-600">
              {progress?.pendingStages?.length ? progress.pendingStages.join(', ') : 'All stages completed'}
            </span>
          </div>
        </div>
      </div>

      {/* Student Details & Module Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Student & Passport Info
          </h2>
          <dl className="grid grid-cols-2 gap-y-2.5 text-xs">
            <dt className="text-slate-400">Email</dt><dd className="text-slate-800 font-medium truncate">{student.email}</dd>
            <dt className="text-slate-400">Phone</dt><dd className="text-slate-800">{student.phone}</dd>
            <dt className="text-slate-400">WhatsApp</dt><dd className="text-slate-800">{student.whatsapp_number || '—'}</dd>
            <dt className="text-slate-400">Passport No.</dt><dd className="text-slate-800 font-mono">{student.passport_number}</dd>
            <dt className="text-slate-400">Passport Expiry</dt><dd className="text-slate-800">{formatDate(student.passport_expiry_date)}</dd>
            <dt className="text-slate-400">Nationality</dt><dd className="text-slate-800">{student.nationality}</dd>
            <dt className="text-slate-400">Date of Birth</dt><dd className="text-slate-800">{formatDate(student.date_of_birth)}</dd>
            <dt className="text-slate-400">Gender</dt><dd className="text-slate-800">{student.gender}</dd>
            <dt className="text-slate-400">Counselor</dt><dd className="text-slate-800 font-medium">{student.counselor?.full_name || 'Unassigned'}</dd>
            <dt className="text-slate-400">Applied On</dt><dd className="text-slate-800">{formatDate(student.application_date)}</dd>
          </dl>
          {student.internal_remarks && (
            <div className="pt-2 border-t border-slate-100 text-xs">
              <p className="text-slate-400 mb-1">Internal Remarks</p>
              <p className="text-slate-700">{student.internal_remarks}</p>
            </div>
          )}
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Admission, Fee & Visa Snapshot
          </h2>
          <dl className="grid grid-cols-2 gap-y-2.5 text-xs">
            <dt className="text-slate-400">Admission Status</dt><dd><StatusBadge status={admission?.status} /></dd>
            <dt className="text-slate-400">Offer Ref</dt><dd className="text-slate-800">{admission?.offer_reference || '—'}</dd>
            <dt className="text-slate-400">Fee Status</dt><dd><StatusBadge status={payment?.payment_status} /></dd>
            <dt className="text-slate-400">Total / Paid</dt>
            <dd className="text-slate-800 font-medium">
              {formatCurrency(payment?.amount_paid, payment?.currency)} / {formatCurrency(payment?.total_fee, payment?.currency)}
            </dd>
            <dt className="text-slate-400">Outstanding</dt>
            <dd className="text-rose-600 font-semibold">{formatCurrency(payment?.outstanding_amount, payment?.currency)}</dd>
            <dt className="text-slate-400">Visa Docs</dt><dd><StatusBadge status={visa?.doc_status} /></dd>
            <dt className="text-slate-400">Visa Eligibility</dt><dd><StatusBadge status={visa?.eligibility_status} /></dd>
            <dt className="text-slate-400">Verified On</dt><dd className="text-slate-800">{formatDate(visa?.verification_date)}</dd>
          </dl>
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
            Flight & Accommodation Snapshot
          </h2>
          <dl className="grid grid-cols-2 gap-y-2.5 text-xs">
            <dt className="text-slate-400">Flight Status</dt><dd><StatusBadge status={flight?.flight_status} /></dd>
            <dt className="text-slate-400">Airline / Flight</dt>
            <dd className="text-slate-800">{flight?.airline ? `${flight.airline} (${flight.flight_number || 'TBD'})` : '—'}</dd>
            <dt className="text-slate-400">Route</dt>
            <dd className="text-slate-800">
              {flight?.departure_airport || flight?.arrival_airport
                ? `${flight?.departure_airport || '?'} → ${flight?.arrival_airport || '?'}`
                : '—'}
            </dd>
            <dt className="text-slate-400">Departure</dt><dd className="text-slate-800">{formatDateTime(flight?.departure_date)}</dd>
            <dt className="text-slate-400">Accommodation</dt><dd><StatusBadge status={accommodation?.requirement_status} /></dd>
            <dt className="text-slate-400">Acc. Payment</dt><dd><StatusBadge status={accommodation?.payment_status} /></dd>
            <dt className="text-slate-400">Property</dt><dd className="text-slate-800">{accommodation?.property_name || '—'}</dd>
            <dt className="text-slate-400">Check-in / Out</dt>
            <dd className="text-slate-800">
              {accommodation?.check_in_date ? `${formatDate(accommodation.check_in_date)} → ${formatDate(accommodation.check_out_date)}` : '—'}
            </dd>
          </dl>
        </div>
      </div>

      {/* Student Documents */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Student Documents ({latestDocs.length})</h2>
          </div>
          {perms.canUploadDocument && (
            <button
              type="button"
              onClick={() => {
                setVersionTarget(null);
                setUploadOpen(true);
              }}
              className="btn-primary text-xs"
            >
              <Upload className="h-3.5 w-3.5" /> Upload Document
            </button>
          )}
        </div>

        {latestDocs.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">No documents uploaded for this student yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-2.5 px-4">Document</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Version</th>
                  <th className="py-2.5 px-4">Verification</th>
                  <th className="py-2.5 px-4">Uploaded</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {latestDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{doc.title}</p>
                      <p className="text-slate-500">{doc.file_name} • {formatFileSize(doc.file_size)}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{doc.category}</td>
                    <td className="py-3 px-4 font-mono">v{doc.version_number}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={doc.verification_status} />
                        {perms.canUploadDocument && (
                          <select
                            value={doc.verification_status}
                            onChange={(e) => handleVerifyDoc(doc.id, e.target.value)}
                            className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] bg-white"
                          >
                            {DOCUMENT_VERIFICATION_STATUSES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {doc.uploader?.full_name || 'Staff'} • {formatDate(doc.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => setPreviewDoc(doc)} title="Preview" className="p-1.5 rounded hover:bg-slate-100 text-slate-600">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDownload(doc.id)} title="Download" className="p-1.5 rounded hover:bg-slate-100 text-slate-600">
                          <Download className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setVersionsDoc(doc)} title="Version History" className="p-1.5 rounded hover:bg-slate-100 text-slate-600">
                          <History className="h-4 w-4" />
                        </button>
                        {perms.canUploadDocument && (
                          <button
                            type="button"
                            onClick={() => {
                              setVersionTarget(doc);
                              setUploadOpen(true);
                            }}
                            title="Upload New Version"
                            className="p-1.5 rounded hover:bg-slate-100 text-indigo-600"
                          >
                            <Upload className="h-4 w-4" />
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

      <DocumentUploadModal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setVersionTarget(null);
        }}
        onUploaded={loadStudent}
        defaultStudentId={student.id}
        versionGroup={versionTarget}
      />

      <DocumentPreviewModal open={Boolean(previewDoc)} onClose={() => setPreviewDoc(null)} documentRecord={previewDoc} />
      <DocumentVersionsModal open={Boolean(versionsDoc)} onClose={() => setVersionsDoc(null)} documentRecord={versionsDoc} />
    </div>
  );
}

