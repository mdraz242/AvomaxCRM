import { ROLES } from '../config/constants.js';
import { assertStudentAccess } from '../middleware/rbac.js';
import { findStudentById } from '../repositories/studentRepository.js';
import {
  createVisaDocumentEntry,
  deleteVisaDocumentEntry,
  findModuleRecordById,
  insertModuleRecord,
  listModuleRecords,
  listVisaDocumentsByApplication,
  updateModuleRecordById,
  updateVisaDocumentEntry
} from '../repositories/trackingRepository.js';
import { AppError } from '../utils/AppError.js';
import { sanitizeText } from '../utils/sanitize.js';
import { logActivity } from './activityService.js';
import { notifyStakeholders } from './notificationService.js';

// ============================================================================
// Admissions
// ============================================================================
export async function listAdmissionsService(query, user) {
  const counselorScopeId = user.role === ROLES.COUNSELOR ? user.id : null;
  return listModuleRecords('admissions', {
    statusField: 'status',
    statusValue: query.status,
    counselorScopeId,
    search: query.search
  });
}

export async function updateAdmissionStatusService(id, payload, user, ipAddress) {
  const existing = await findModuleRecordById('admissions', id);
  if (!existing) throw new AppError('Admission record not found.', 404);
  assertStudentAccess(user, existing.student, { write: true });

  const updates = {
    ...payload,
    remarks: payload.remarks !== undefined ? (payload.remarks ? sanitizeText(payload.remarks) : null) : existing.remarks,
    updated_by: user.id
  };

  const updated = await updateModuleRecordById('admissions', id, updates);

  await logActivity({
    actorId: user.id,
    studentId: existing.student_id,
    entityType: 'admission',
    entityId: id,
    action: 'admission_status_updated',
    description: `Admission status for ${existing.student.full_name} changed from "${existing.status}" to "${payload.status}"`,
    metadata: { from: existing.status, to: payload.status },
    ipAddress
  });

  if (existing.status !== payload.status) {
    await notifyStakeholders({
      studentId: existing.student_id,
      assignedCounselorId: existing.student.assigned_counselor_id,
      actorId: user.id,
      eventType: 'admission_status_changed',
      title: 'Admission Status Updated',
      message: `${existing.student.full_name} (${existing.student.student_code}) admission status updated to "${payload.status}".`
    });
  }

  return updated;
}

// ============================================================================
// Fee Payments
// ============================================================================
export async function listPaymentsService(query, user) {
  const counselorScopeId = user.role === ROLES.COUNSELOR ? user.id : null;
  return listModuleRecords('fee_payments', {
    statusField: 'payment_status',
    statusValue: query.payment_status,
    counselorScopeId,
    search: query.search
  });
}

export async function createPaymentService(payload, user, ipAddress) {
  const student = await findStudentById(payload.student_id);
  assertStudentAccess(user, student, { write: true });

  const created = await insertModuleRecord('fee_payments', {
    ...payload,
    remarks: payload.remarks ? sanitizeText(payload.remarks) : null,
    updated_by: user.id
  });

  await logActivity({
    actorId: user.id,
    studentId: student.id,
    entityType: 'payment',
    entityId: created.id,
    action: 'payment_recorded',
    description: `Recorded fee status "${created.payment_status}" (${created.currency} ${created.amount_paid}/${created.total_fee}) for ${student.full_name}`,
    ipAddress
  });

  if (['Paid', 'Partially Paid'].includes(created.payment_status)) {
    await notifyStakeholders({
      studentId: student.id,
      assignedCounselorId: student.assigned_counselor_id,
      actorId: user.id,
      eventType: 'payment_received',
      title: 'Fee Payment Recorded',
      message: `Payment of ${created.currency} ${created.amount_paid} (${created.payment_status}) recorded for ${student.full_name}.`
    });
  }

  return created;
}

export async function updatePaymentService(id, payload, user, ipAddress) {
  const existing = await findModuleRecordById('fee_payments', id);
  if (!existing) throw new AppError('Fee payment record not found.', 404);
  assertStudentAccess(user, existing.student, { write: true });

  const totalFee = payload.total_fee !== undefined ? Number(payload.total_fee) : Number(existing.total_fee);
  const amountPaid = payload.amount_paid !== undefined ? Number(payload.amount_paid) : Number(existing.amount_paid);
  if (totalFee > 0 && amountPaid > totalFee) {
    throw new AppError('Amount paid cannot exceed total admission fee.', 400);
  }

  const updated = await updateModuleRecordById('fee_payments', id, {
    ...payload,
    remarks: payload.remarks !== undefined ? (payload.remarks ? sanitizeText(payload.remarks) : null) : existing.remarks,
    updated_by: user.id
  });

  await logActivity({
    actorId: user.id,
    studentId: existing.student_id,
    entityType: 'payment',
    entityId: id,
    action: 'payment_updated',
    description: `Updated fee record for ${existing.student.full_name}: ${updated.payment_status} (${updated.currency} ${updated.amount_paid}/${updated.total_fee})`,
    ipAddress
  });

  if (
    ['Paid', 'Partially Paid'].includes(updated.payment_status) &&
    (existing.payment_status !== updated.payment_status || Number(existing.amount_paid) !== Number(updated.amount_paid))
  ) {
    await notifyStakeholders({
      studentId: existing.student_id,
      assignedCounselorId: existing.student.assigned_counselor_id,
      actorId: user.id,
      eventType: 'payment_received',
      title: 'Fee Payment Received',
      message: `Fee payment updated to "${updated.payment_status}" (${updated.currency} ${updated.amount_paid}) for ${existing.student.full_name}.`
    });
  }

  return updated;
}

// ============================================================================
// Visa Processing & Visa Documents
// ============================================================================
export async function listVisaService(query, user) {
  const counselorScopeId = user.role === ROLES.COUNSELOR ? user.id : null;
  let rows = await listModuleRecords('visa_applications', {
    counselorScopeId,
    search: query.search,
    extraSelect: ', verified_by_profile:profiles!visa_applications_verified_by_fkey(id, full_name)'
  });

  if (query.doc_status) {
    rows = rows.filter((r) => r.doc_status === query.doc_status);
  }
  if (query.eligibility_status) {
    rows = rows.filter((r) => r.eligibility_status === query.eligibility_status);
  }

  return rows;
}

export async function updateVisaStatusService(id, payload, user, ipAddress) {
  const existing = await findModuleRecordById('visa_applications', id);
  if (!existing) throw new AppError('Visa application record not found.', 404);
  assertStudentAccess(user, existing.student, { write: true });

  const updates = {
    ...payload,
    updated_by: user.id
  };

  if (payload.eligibility_remarks !== undefined) {
    updates.eligibility_remarks = payload.eligibility_remarks ? sanitizeText(payload.eligibility_remarks) : null;
  }
  if (payload.remarks !== undefined) {
    updates.remarks = payload.remarks ? sanitizeText(payload.remarks) : null;
  }

  if (payload.eligibility_status && payload.eligibility_status !== existing.eligibility_status) {
    updates.verified_by = user.id;
    if (!updates.verification_date) {
      updates.verification_date = new Date().toISOString().slice(0, 10);
    }
  }

  const updated = await updateModuleRecordById('visa_applications', id, updates);

  await logActivity({
    actorId: user.id,
    studentId: existing.student_id,
    entityType: 'visa',
    entityId: id,
    action: 'visa_updated',
    description: `Updated visa status for ${existing.student.full_name} (Docs: ${updated.doc_status}, Eligibility: ${updated.eligibility_status})`,
    ipAddress
  });

  if (payload.doc_status === 'Documents Ready' && existing.doc_status !== 'Documents Ready') {
    await notifyStakeholders({
      studentId: existing.student_id,
      assignedCounselorId: existing.student.assigned_counselor_id,
      actorId: user.id,
      eventType: 'visa_documents_ready',
      title: 'Visa Documents Ready',
      message: `Visa documents for ${existing.student.full_name} are marked Ready.`
    });
  }

  if (
    payload.eligibility_status === 'Eligible to Proceed with Visa' &&
    existing.eligibility_status !== 'Eligible to Proceed with Visa'
  ) {
    await notifyStakeholders({
      studentId: existing.student_id,
      assignedCounselorId: existing.student.assigned_counselor_id,
      actorId: user.id,
      eventType: 'visa_eligibility_approved',
      title: 'Visa Eligibility Approved',
      message: `${existing.student.full_name} is now marked Eligible to Proceed with Visa.`
    });
  }

  return updated;
}

export async function listVisaDocumentsService(visaApplicationId, user) {
  const visaApp = await findModuleRecordById('visa_applications', visaApplicationId);
  if (!visaApp) throw new AppError('Visa application not found.', 404);
  assertStudentAccess(user, visaApp.student, { write: false });
  return listVisaDocumentsByApplication(visaApplicationId);
}

export async function addVisaDocumentService(visaApplicationId, payload, user, ipAddress) {
  const visaApp = await findModuleRecordById('visa_applications', visaApplicationId);
  if (!visaApp) throw new AppError('Visa application not found.', 404);
  assertStudentAccess(user, visaApp.student, { write: true });

  const created = await createVisaDocumentEntry({
    visa_application_id: visaApplicationId,
    student_id: visaApp.student_id,
    document_name: sanitizeText(payload.document_name),
    document_id: payload.document_id || null,
    is_mandatory: payload.is_mandatory ?? true,
    status: payload.status || 'Pending',
    remarks: payload.remarks ? sanitizeText(payload.remarks) : null,
    uploaded_by: user.id
  });

  await logActivity({
    actorId: user.id,
    studentId: visaApp.student_id,
    entityType: 'visa_document',
    entityId: created.id,
    action: 'visa_document_added',
    description: `Added visa document item "${created.document_name}" for ${visaApp.student.full_name}`,
    ipAddress
  });

  return created;
}

export async function updateVisaDocumentService(visaApplicationId, docId, payload, user) {
  const visaApp = await findModuleRecordById('visa_applications', visaApplicationId);
  if (!visaApp) throw new AppError('Visa application not found.', 404);
  assertStudentAccess(user, visaApp.student, { write: true });

  return updateVisaDocumentEntry(docId, {
    ...payload,
    remarks: payload.remarks ? sanitizeText(payload.remarks) : payload.remarks
  });
}

export async function deleteVisaDocumentService(visaApplicationId, docId, user) {
  const visaApp = await findModuleRecordById('visa_applications', visaApplicationId);
  if (!visaApp) throw new AppError('Visa application not found.', 404);
  assertStudentAccess(user, visaApp.student, { write: true });

  return deleteVisaDocumentEntry(docId);
}

// ============================================================================
// Flights
// ============================================================================
export async function listFlightsService(query, user) {
  const counselorScopeId = user.role === ROLES.COUNSELOR ? user.id : null;
  return listModuleRecords('flights', {
    statusField: 'flight_status',
    statusValue: query.flight_status,
    counselorScopeId,
    search: query.search
  });
}

export async function createFlightService(payload, user, ipAddress) {
  const student = await findStudentById(payload.student_id);
  assertStudentAccess(user, student, { write: true });

  const created = await insertModuleRecord('flights', {
    ...payload,
    remarks: payload.remarks ? sanitizeText(payload.remarks) : null,
    updated_by: user.id
  });

  await logActivity({
    actorId: user.id,
    studentId: student.id,
    entityType: 'flight',
    entityId: created.id,
    action: 'flight_created',
    description: `Added flight record (${created.flight_status}) for ${student.full_name}`,
    ipAddress
  });

  if (created.flight_status === 'Flight Ticket Booked' || created.flight_number) {
    await notifyStakeholders({
      studentId: student.id,
      assignedCounselorId: student.assigned_counselor_id,
      actorId: user.id,
      eventType: 'flight_added',
      title: 'Flight Details Added',
      message: `Flight details (${created.flight_status}${created.flight_number ? ` - ${created.flight_number}` : ''}) added for ${student.full_name}.`
    });
  }

  return created;
}

export async function updateFlightService(id, payload, user, ipAddress) {
  const existing = await findModuleRecordById('flights', id);
  if (!existing) throw new AppError('Flight record not found.', 404);
  assertStudentAccess(user, existing.student, { write: true });

  const updated = await updateModuleRecordById('flights', id, {
    ...payload,
    remarks: payload.remarks !== undefined ? (payload.remarks ? sanitizeText(payload.remarks) : null) : existing.remarks,
    updated_by: user.id
  });

  await logActivity({
    actorId: user.id,
    studentId: existing.student_id,
    entityType: 'flight',
    entityId: id,
    action: 'flight_updated',
    description: `Updated flight status to "${updated.flight_status}" for ${existing.student.full_name}`,
    ipAddress
  });

  if (
    updated.flight_status === 'Flight Ticket Booked' &&
    existing.flight_status !== 'Flight Ticket Booked'
  ) {
    await notifyStakeholders({
      studentId: existing.student_id,
      assignedCounselorId: existing.student.assigned_counselor_id,
      actorId: user.id,
      eventType: 'flight_booked',
      title: 'Flight Ticket Booked',
      message: `Flight ticket booked for ${existing.student.full_name} (${updated.airline || 'Airline'} ${updated.flight_number || ''}).`
    });
  }

  return updated;
}

// ============================================================================
// Accommodations
// ============================================================================
export async function listAccommodationsService(query, user) {
  const counselorScopeId = user.role === ROLES.COUNSELOR ? user.id : null;
  let rows = await listModuleRecords('accommodations', {
    counselorScopeId,
    search: query.search
  });

  if (query.requirement_status) {
    rows = rows.filter((r) => r.requirement_status === query.requirement_status);
  }
  if (query.payment_status) {
    rows = rows.filter((r) => r.payment_status === query.payment_status);
  }
  return rows;
}

export async function createAccommodationService(payload, user, ipAddress) {
  const student = await findStudentById(payload.student_id);
  assertStudentAccess(user, student, { write: true });

  if (payload.check_in_date && payload.check_out_date && payload.check_out_date < payload.check_in_date) {
    throw new AppError('Check-out date must be on or after check-in date.', 400);
  }

  const created = await insertModuleRecord('accommodations', {
    ...payload,
    remarks: payload.remarks ? sanitizeText(payload.remarks) : null,
    updated_by: user.id
  });

  await logActivity({
    actorId: user.id,
    studentId: student.id,
    entityType: 'accommodation',
    entityId: created.id,
    action: 'accommodation_created',
    description: `Created accommodation record (${created.requirement_status}) for ${student.full_name}`,
    ipAddress
  });

  if (['Hostel Reserved', 'Off-campus Accommodation Reserved'].includes(created.requirement_status)) {
    await notifyStakeholders({
      studentId: student.id,
      assignedCounselorId: student.assigned_counselor_id,
      actorId: user.id,
      eventType: 'accommodation_reserved',
      title: 'Accommodation Reserved',
      message: `Accommodation (${created.requirement_status}) reserved for ${student.full_name}.`
    });
  }

  return created;
}

export async function updateAccommodationService(id, payload, user, ipAddress) {
  const existing = await findModuleRecordById('accommodations', id);
  if (!existing) throw new AppError('Accommodation record not found.', 404);
  assertStudentAccess(user, existing.student, { write: true });

  const checkIn = payload.check_in_date !== undefined ? payload.check_in_date : existing.check_in_date;
  const checkOut = payload.check_out_date !== undefined ? payload.check_out_date : existing.check_out_date;
  if (checkIn && checkOut && checkOut < checkIn) {
    throw new AppError('Check-out date must be on or after check-in date.', 400);
  }

  const updated = await updateModuleRecordById('accommodations', id, {
    ...payload,
    remarks: payload.remarks !== undefined ? (payload.remarks ? sanitizeText(payload.remarks) : null) : existing.remarks,
    updated_by: user.id
  });

  await logActivity({
    actorId: user.id,
    studentId: existing.student_id,
    entityType: 'accommodation',
    entityId: id,
    action: 'accommodation_updated',
    description: `Updated accommodation to "${updated.requirement_status}" (${updated.payment_status}) for ${existing.student.full_name}`,
    ipAddress
  });

  if (
    ['Hostel Reserved', 'Off-campus Accommodation Reserved'].includes(updated.requirement_status) &&
    existing.requirement_status !== updated.requirement_status
  ) {
    await notifyStakeholders({
      studentId: existing.student_id,
      assignedCounselorId: existing.student.assigned_counselor_id,
      actorId: user.id,
      eventType: 'accommodation_reserved',
      title: 'Accommodation Reserved',
      message: `${updated.requirement_status} confirmed for ${existing.student.full_name}.`
    });
  }

  return updated;
}

