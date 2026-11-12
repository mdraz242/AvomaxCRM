import crypto from 'node:crypto';
import { ROLES } from '../config/constants.js';
import { env } from '../config/env.js';
import { getSupabase } from '../config/supabase.js';
import { assertStudentAccess } from '../middleware/rbac.js';
import {
  findDocumentById,
  findDocumentVersions,
  getNextDocumentVersion,
  insertDocumentMetadata,
  listDocuments,
  markPreviousVersionsNotLatest,
  softDeleteDocumentRecord,
  updateDocumentRecord
} from '../repositories/documentRepository.js';
import { findStudentById } from '../repositories/studentRepository.js';
import { AppError } from '../utils/AppError.js';
import { sanitizeFileName, sanitizeText } from '../utils/sanitize.js';
import { logActivity } from './activityService.js';

export async function listDocumentsService(query, user) {
  const counselorScopeId = user.role === ROLES.COUNSELOR ? user.id : null;
  return listDocuments({
    studentId: query.student_id,
    category: query.category,
    verificationStatus: query.verification_status,
    includeHistory: query.include_history === 'true',
    counselorScopeId
  });
}

export async function getStudentDocumentsService(studentId, user, includeHistory = true) {
  const student = await findStudentById(studentId);
  assertStudentAccess(user, student, { write: false });
  return listDocuments({ studentId, includeHistory });
}

export async function uploadDocumentService({ file, body, user, ipAddress }) {
  if (!file) {
    throw new AppError('No document file uploaded.', 400);
  }

  const student = await findStudentById(body.student_id);
  assertStudentAccess(user, student, { write: true });

  const supabase = getSupabase();
  const groupId = body.document_group_id || crypto.randomUUID();
  const { versionNumber } = body.document_group_id
    ? await getNextDocumentVersion(body.student_id, body.document_group_id)
    : { versionNumber: 1 };

  const cleanFileName = sanitizeFileName(file.originalname);
  const storagePath = `students/${student.id}/${groupId}/v${versionNumber}_${Date.now()}_${cleanFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(env.supabaseStorageBucket)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (uploadError) {
    throw new AppError(`Storage upload failed: ${uploadError.message}`, 500);
  }

  if (versionNumber > 1) {
    await markPreviousVersionsNotLatest(groupId);
  }

  const created = await insertDocumentMetadata({
    student_id: student.id,
    document_group_id: groupId,
    category: body.category,
    title: sanitizeText(body.title),
    file_name: cleanFileName,
    storage_bucket: env.supabaseStorageBucket,
    storage_path: storagePath,
    mime_type: file.mimetype,
    file_size: file.size,
    version_number: versionNumber,
    is_latest: true,
    verification_status: 'Pending',
    verification_remarks: body.verification_remarks ? sanitizeText(body.verification_remarks) : null,
    uploaded_by: user.id
  });

  await logActivity({
    actorId: user.id,
    studentId: student.id,
    entityType: 'document',
    entityId: created.id,
    action: 'document_uploaded',
    description: `Uploaded ${body.category} "${created.title}" (v${versionNumber}) for ${student.full_name}`,
    metadata: { category: body.category, version: versionNumber, fileName: cleanFileName },
    ipAddress
  });

  return created;
}

export async function getSignedDocumentUrlService(documentId, user, { download = false } = {}) {
  const doc = await findDocumentById(documentId);
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }
  assertStudentAccess(user, doc.student, { write: false });

  const supabase = getSupabase();
  const options = download ? { download: doc.file_name } : undefined;
  const { data, error } = await supabase.storage
    .from(doc.storage_bucket || env.supabaseStorageBucket)
    .createSignedUrl(doc.storage_path, 300, options); // 5-minute private signed URL

  if (error || !data?.signedUrl) {
    throw new AppError('Unable to generate secure document link.', 500);
  }

  return {
    signedUrl: data.signedUrl,
    expiresInSeconds: 300,
    document: doc
  };
}

export async function getDocumentVersionsService(documentId, user) {
  const doc = await findDocumentById(documentId);
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }
  assertStudentAccess(user, doc.student, { write: false });

  return findDocumentVersions(doc.document_group_id);
}

export async function verifyDocumentService(documentId, payload, user, ipAddress) {
  const doc = await findDocumentById(documentId);
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }
  assertStudentAccess(user, doc.student, { write: true });

  const updated = await updateDocumentRecord(documentId, {
    verification_status: payload.verification_status,
    verification_remarks: payload.verification_remarks ? sanitizeText(payload.verification_remarks) : null,
    verified_by: user.id,
    verified_at: new Date().toISOString()
  });

  await logActivity({
    actorId: user.id,
    studentId: doc.student_id,
    entityType: 'document',
    entityId: documentId,
    action: 'document_verified',
    description: `Marked "${doc.title}" as ${payload.verification_status} for ${doc.student.full_name}`,
    ipAddress
  });

  return updated;
}

export async function deleteDocumentService(documentId, user, ipAddress) {
  const doc = await findDocumentById(documentId);
  if (!doc) {
    throw new AppError('Document not found.', 404);
  }
  assertStudentAccess(user, doc.student, { write: true });

  const supabase = getSupabase();
  await supabase.storage
    .from(doc.storage_bucket || env.supabaseStorageBucket)
    .remove([doc.storage_path]);

  await softDeleteDocumentRecord(documentId);

  await logActivity({
    actorId: user.id,
    studentId: doc.student_id,
    entityType: 'document',
    entityId: documentId,
    action: 'document_deleted',
    description: `Deleted document "${doc.title}" (v${doc.version_number}) for ${doc.student.full_name}`,
    ipAddress
  });

  return { id: documentId };
}

