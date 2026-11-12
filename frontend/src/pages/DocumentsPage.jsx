import { Download, Eye, History, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState.jsx';
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
import { DOCUMENT_CATEGORIES, DOCUMENT_VERIFICATION_STATUSES } from '../utils/constants.js';
import { formatDate, formatFileSize } from '../utils/formatters.js';

export default function DocumentsPage() {
  const { toast } = useToast();
  const perms = usePermissions();

  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [docs, setDocs] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [versionTarget, setVersionTarget] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [versionsDoc, setVersionsDoc] = useState(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentApi.list({
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(statusFilter ? { verification_status: statusFilter } : {})
      });
      setDocs(res.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load documents'));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, toast]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    studentApi.list({ limit: 100 }).then((r) => setStudents(r.data || [])).catch(() => {});
  }, []);

  const handleDownload = async (docId) => {
    try {
      const res = await documentApi.getSignedUrl(docId, true);
      window.open(res.data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Download failed'));
    }
  };

  const handleVerify = async (docId, verification_status) => {
    try {
      await documentApi.verify(docId, { verification_status });
      toast.success(`Verification status updated to ${verification_status}`);
      loadDocs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update status'));
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}" (v${doc.version_number})?`)) return;
    try {
      await documentApi.remove(doc.id);
      toast.success('Document deleted');
      loadDocs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Document Management</h1>
          <p className="text-sm text-slate-500">
            Private Supabase Storage vault with version history, verification, and signed-URL previews.
          </p>
        </div>
        {perms.canUploadDocument && (
          <button
            type="button"
            onClick={() => {
              setVersionTarget(null);
              setUploadOpen(true);
            }}
            className="btn-primary self-start"
          >
            <Upload className="h-4 w-4" /> Upload Document
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <select className="input-field sm:w-64" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="input-field sm:w-56" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Verification Statuses</option>
          {DOCUMENT_VERIFICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading documents..." />
        ) : docs.length === 0 ? (
          <EmptyState title="No documents uploaded yet" description="Upload passports, transcripts, offer letters, or visa documents." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{doc.title}</p>
                      <p className="text-xs text-slate-500">{doc.file_name} • {formatFileSize(doc.file_size)}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link to={`/students/${doc.student.id}`} className="font-medium text-indigo-600 hover:underline">
                        {doc.student.full_name}
                      </Link>
                      <div className="text-xs text-slate-500">{doc.student.student_code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">{doc.category}</td>
                    <td className="py-3.5 px-4 text-xs font-mono">v{doc.version_number}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={doc.verification_status} />
                        {perms.canUploadDocument && (
                          <select
                            value={doc.verification_status}
                            onChange={(e) => handleVerify(doc.id, e.target.value)}
                            className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] bg-white"
                          >
                            {DOCUMENT_VERIFICATION_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div>{doc.uploader?.full_name || 'Staff'}</div>
                      <div className="text-slate-400">{formatDate(doc.created_at)}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
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
                        {perms.canDeleteDocument && (
                          <button type="button" onClick={() => handleDelete(doc)} title="Delete" className="p-1.5 rounded hover:bg-rose-50 text-rose-600">
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
        )}
      </div>

      <DocumentUploadModal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setVersionTarget(null);
        }}
        onUploaded={loadDocs}
        students={students}
        versionGroup={versionTarget}
      />

      <DocumentPreviewModal open={Boolean(previewDoc)} onClose={() => setPreviewDoc(null)} documentRecord={previewDoc} />
      <DocumentVersionsModal open={Boolean(versionsDoc)} onClose={() => setVersionsDoc(null)} documentRecord={versionsDoc} />
    </div>
  );
}

