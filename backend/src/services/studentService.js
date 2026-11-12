import { ROLES } from '../config/constants.js';
import { assertStudentAccess } from '../middleware/rbac.js';
import { listDocuments } from '../repositories/documentRepository.js';
import {
  createStudentWithModules,
  findStudentById,
  findStudents,
  getLatestRecord,
  softDeleteStudent,
  updateStudentRecord
} from '../repositories/studentRepository.js';
import { AppError } from '../utils/AppError.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { sanitizeText } from '../utils/sanitize.js';
import { logActivity } from './activityService.js';
import { notifyStakeholders } from './notificationService.js';
import { calculateStudentProgress } from './progressService.js';

export function formatStudentRecord(raw) {
  if (!raw) return null;
  const admission = Array.isArray(raw.admission) ? raw.admission[0] || null : raw.admission || null;
  const visa = Array.isArray(raw.visa) ? raw.visa[0] || null : raw.visa || null;
  const latestPayment = getLatestRecord(raw.fee_payments);
  const latestFlight = getLatestRecord(raw.flights);
  const latestAccommodation = getLatestRecord(raw.accommodations);

  const progress = calculateStudentProgress({
    student: raw,
    admission,
    payment: latestPayment,
    visa,
    flight: latestFlight,
    accommodation: latestAccommodation
  });

  return {
    ...raw,
    admission,
    visa,
    latest_payment: latestPayment,
    latest_flight: latestFlight,
    latest_accommodation: latestAccommodation,
    progress
  };
}

export async function listStudentsService(query, user) {
  const { page, limit } = parsePagination(query);
  const counselorScopeId = user.role === ROLES.COUNSELOR ? user.id : null;

  const { records, total } = await findStudents({
    ...query,
    page,
    limit,
    counselorScopeId
  });

  return {
    students: records.map(formatStudentRecord),
    pagination: buildPaginationMeta({ total, page, limit })
  };
}

export async function getStudentDetailService(id, user) {
  const student = await findStudentById(id);
  assertStudentAccess(user, student, { write: false });

  const documents = await listDocuments({ studentId: id, includeHistory: true });
  const formatted = formatStudentRecord(student);

  return {
    ...formatted,
    documents
  };
}

export async function createStudentService(payload, user, ipAddress) {
  const sanitized = {
    ...payload,
    full_name: sanitizeText(payload.full_name),
    university_name: sanitizeText(payload.university_name),
    course_name: sanitizeText(payload.course_name),
    destination_country: sanitizeText(payload.destination_country),
    nationality: sanitizeText(payload.nationality),
    internal_remarks: payload.internal_remarks ? sanitizeText(payload.internal_remarks) : null
  };

  if (new Date(sanitized.passport_expiry_date) <= new Date(sanitized.date_of_birth)) {
    throw new AppError('Passport expiry date must be after date of birth.', 400);
  }

  const created = await createStudentWithModules(sanitized, user.id);

  await logActivity({
    actorId: user.id,
    studentId: created.id,
    entityType: 'student',
    entityId: created.id,
    action: 'student_created',
    description: `Created student ${created.full_name} (${created.student_code})`,
    metadata: { university: created.university_name, country: created.destination_country },
    ipAddress
  });

  if (created.assigned_counselor_id) {
    await notifyStakeholders({
      studentId: created.id,
      assignedCounselorId: created.assigned_counselor_id,
      actorId: user.id,
      eventType: 'counselor_assigned',
      title: 'New Student Assigned',
      message: `${created.full_name} (${created.student_code}) has been assigned to a counselor.`,
      includeAssignedCounselorAlways: true
    });
  }

  return formatStudentRecord(created);
}

export async function updateStudentService(id, payload, user, ipAddress) {
  const existing = await findStudentById(id);
  assertStudentAccess(user, existing, { write: true });

  // Counselors cannot reassign students to other counselors
  if (user.role === ROLES.COUNSELOR && payload.assigned_counselor_id !== undefined && payload.assigned_counselor_id !== existing.assigned_counselor_id) {
    throw new AppError('Counselors cannot reassign students to another counselor.', 403);
  }

  const sanitized = { ...payload };
  if (sanitized.full_name) sanitized.full_name = sanitizeText(sanitized.full_name);
  if (sanitized.university_name) sanitized.university_name = sanitizeText(sanitized.university_name);
  if (sanitized.course_name) sanitized.course_name = sanitizeText(sanitized.course_name);
  if (sanitized.internal_remarks !== undefined) {
    sanitized.internal_remarks = sanitized.internal_remarks ? sanitizeText(sanitized.internal_remarks) : null;
  }

  const updated = await updateStudentRecord(id, sanitized, user.id);

  await logActivity({
    actorId: user.id,
    studentId: id,
    entityType: 'student',
    entityId: id,
    action: 'student_updated',
    description: `Updated profile for ${updated.full_name} (${updated.student_code})`,
    ipAddress
  });

  if (
    payload.assigned_counselor_id &&
    payload.assigned_counselor_id !== existing.assigned_counselor_id
  ) {
    await notifyStakeholders({
      studentId: id,
      assignedCounselorId: payload.assigned_counselor_id,
      actorId: user.id,
      eventType: 'counselor_assigned',
      title: 'Student Assigned',
      message: `${updated.full_name} (${updated.student_code}) has been assigned to you.`,
      includeAssignedCounselorAlways: true
    });
  }

  return formatStudentRecord(updated);
}

export async function deleteStudentService(id, user, ipAddress) {
  const existing = await findStudentById(id);
  assertStudentAccess(user, existing, { write: true });

  await softDeleteStudent(id, user.id);

  await logActivity({
    actorId: user.id,
    studentId: id,
    entityType: 'student',
    entityId: id,
    action: 'student_deleted',
    description: `Archived student ${existing.full_name} (${existing.student_code})`,
    ipAddress
  });

  return { id };
}

