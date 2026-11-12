import { Download, History, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getApiErrorMessage } from '../../services/api.js';
import { documentApi } from '../../services/crmServices.js';
import { DOCUMENT_CATEGORIES } from '../../utils/constants.js';
import { formatDateTime, formatFileSize } from '../../utils/formatters.js';

export function DocumentUploadModal({ open, onClose, onUploaded, students = [], defaultStudentId = '', versionGroup = null }) {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState(defaultStudentId);
  const [category, setCategory] = useState('Passport');
  const [title, setTitle] = useState('');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setStudentId(versionGroup?.student_id || defaultStudentId || '');
      setCategory(versionGroup?.category || 'Passport');
      setTitle(versionGroup?.title || '');
      setRemarks('');
      setFile(null);
    }
  }, [open, defaultStudentId, versionGroup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId || !file || !title.trim()) {
      toast.error('Please select a student, title, and file.');
      return;
    }

    const fd = new FormData();
    fd.append('student_id', studentId);
    fd.append('category', category);
    fd.append('title', title.trim());
    if (remarks.trim()) fd.append('verification_remarks', remarks.trim());
    if (versionGroup?.document_group_id) {
      fd.append('document_group_id', versionGroup.document_group_id);
    }
    fd.append('file', file);

    setUploading(true);
    try {
      await documentApi.upload(fd);
      toast.success(versionGroup ? 'New document version uploaded' : 'Document uploaded securely');
      onUploaded?.();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Document upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={versionGroup ? `Upload New Version — ${versionGroup.title}` : 'Upload Student Document'}
      subtitle="Stored in private Supabase Storage; accessible only via short-lived signed URLs."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!defaultStudentId && !versionGroup && (
          <div>
            <label className="label-text">Student *</label>
            <select
              className="input-field"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            >
              <option value="">Select student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.student_code} — {s.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-text">Document Category *</label>
            <select
              className="input-field"
              value={category}
              disabled={Boolean(versionGroup)}
              onChange={(e) => setCategory(e.target.value)}
            >
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text">Document Title *</label>
            <input
              className="input-field"
              placeholder="e.g. Valid Passport Copy"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="label-text">File (PDF, JPG, PNG, WEBP, DOC, DOCX — max 10MB) *</label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            required
          />
        </div>

        <div>
          <label className="label-text">Notes / Remarks</label>
          <textarea
            rows={2}
            className="input-field"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={uploading} className="btn-primary">
            <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DocumentPreviewModal({ open, onClose, documentRecord }) {
  const { toast } = useToast();
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !documentRecord) return;
    setLoading(true);
    documentApi
      .getSignedUrl(documentRecord.id, false)
      .then((res) => setSignedUrl(res.data.signedUrl))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Unable to load preview')))
      .finally(() => setLoading(false));
  }, [open, documentRecord, toast]);

  const handleDownload = async () => {
    try {
      const res = await documentApi.getSignedUrl(documentRecord.id, true);
      window.open(res.data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Download failed'));
    }
  };

  const isImage = documentRecord?.mime_type?.startsWith('image/');
  const isPdf = documentRecord?.mime_type === 'application/pdf';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={documentRecord?.title || 'Document Preview'}
      subtitle={documentRecord ? `${documentRecord.category} • Version ${documentRecord.version_number} • ${formatFileSize(documentRecord.file_size)}` : ''}
      maxWidth="max-w-4xl"
    >
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Generating secure signed URL...</div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={handleDownload} className="btn-secondary text-xs">
              <Download className="h-3.5 w-3.5" /> Download Original File
            </button>
          </div>
          {isImage && signedUrl ? (
            <img src={signedUrl} alt={documentRecord.title} className="max-h-[65vh] mx-auto rounded-lg border border-slate-200" />
          ) : isPdf && signedUrl ? (
            <iframe src={signedUrl} title={documentRecord.title} className="w-full h-[65vh] rounded-lg border border-slate-200" />
          ) : (
            <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-sm text-slate-700 mb-3">
                Inline browser preview is unavailable for <span className="font-medium">{documentRecord?.mime_type}</span>.
              </p>
              <button type="button" onClick={handleDownload} className="btn-primary">
                <Download className="h-4 w-4" /> Download File
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function DocumentVersionsModal({ open, onClose, documentRecord }) {
  const { toast } = useToast();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !documentRecord) return;
    setLoading(true);
    documentApi
      .getVersions(documentRecord.id)
      .then((res) => setVersions(res.data || []))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed to load version history')))
      .finally(() => setLoading(false));
  }, [open, documentRecord, toast]);

  const handleDownloadVersion = async (id) => {
    try {
      const res = await documentApi.getSignedUrl(id, true);
      window.open(res.data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Download failed'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Version History — ${documentRecord?.title || ''}`}
      subtitle="Complete immutable version audit trail."
    >
      {loading ? (
        <div className="py-8 text-center text-sm text-slate-500">Loading versions...</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {versions.map((v) => (
            <div key={v.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-900">Version {v.version_number}</span>
                  {v.is_latest && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      Latest
                    </span>
                  )}
                  <StatusBadge status={v.verification_status} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {v.file_name} ({formatFileSize(v.file_size)}) • Uploaded by {v.uploader?.full_name || 'Staff'} on{' '}
                  {formatDateTime(v.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadVersion(v.id)}
                className="btn-secondary px-2.5 py-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

