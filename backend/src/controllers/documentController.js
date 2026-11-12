import {
  deleteDocumentService,
  getDocumentVersionsService,
  getSignedDocumentUrlService,
  getStudentDocumentsService,
  listDocumentsService,
  uploadDocumentService,
  verifyDocumentService
} from '../services/documentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listDocuments = asyncHandler(async (req, res) => {
  const data = await listDocumentsService(req.query, req.user);
  res.json({ success: true, data });
});

export const getStudentDocuments = asyncHandler(async (req, res) => {
  const includeHistory = req.query.include_history !== 'false';
  const data = await getStudentDocumentsService(req.params.studentId, req.user, includeHistory);
  res.json({ success: true, data });
});

export const uploadDocument = asyncHandler(async (req, res) => {
  const data = await uploadDocumentService({
    file: req.file,
    body: req.body,
    user: req.user,
    ipAddress: req.ip
  });
  res.status(201).json({ success: true, data });
});

export const getSignedUrl = asyncHandler(async (req, res) => {
  const download = req.query.download === 'true';
  const data = await getSignedDocumentUrlService(req.params.id, req.user, { download });
  res.json({ success: true, data });
});

export const getDocumentVersions = asyncHandler(async (req, res) => {
  const data = await getDocumentVersionsService(req.params.id, req.user);
  res.json({ success: true, data });
});

export const verifyDocument = asyncHandler(async (req, res) => {
  const data = await verifyDocumentService(req.params.id, req.body, req.user, req.ip);
  res.json({ success: true, data });
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const data = await deleteDocumentService(req.params.id, req.user, req.ip);
  res.json({ success: true, message: 'Document deleted successfully', data });
});

