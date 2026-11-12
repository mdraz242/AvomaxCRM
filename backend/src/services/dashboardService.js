import {
  ACCOMMODATION_REQUIREMENTS,
  ADMISSION_STATUSES,
  FLIGHT_STATUSES,
  ROLES,
  VISA_DOC_STATUSES
} from '../config/constants.js';
import { findStudents, getLatestRecord } from '../repositories/studentRepository.js';
import { listActivityLogs } from './activityService.js';

export async function getDashboardStatsService(user) {
  const counselorScopeId = user.role === ROLES.COUNSELOR ? user.id : null;
  const { records } = await findStudents({ counselorScopeId, fetchAll: true });

  let admissionConfirmed = 0;
  let admissionFeePaid = 0;
  let compilingVisaDocuments = 0;
  let eligibleForVisa = 0;
  let flightTicketsBooked = 0;
  let accommodationReserved = 0;

  for (const s of records) {
    const admission = Array.isArray(s.admission) ? s.admission[0] : s.admission;
    const payment = getLatestRecord(s.fee_payments);
    const visa = Array.isArray(s.visa) ? s.visa[0] : s.visa;
    const flight = getLatestRecord(s.flights);
    const accommodation = getLatestRecord(s.accommodations);

    if (admission?.status === 'Admission Confirmed') admissionConfirmed += 1;
    if (payment?.payment_status === 'Paid') admissionFeePaid += 1;
    if (visa?.doc_status === 'Compiling Visa Documents') compilingVisaDocuments += 1;
    if (visa?.eligibility_status === 'Eligible to Proceed with Visa') eligibleForVisa += 1;
    if (flight?.flight_status === 'Flight Ticket Booked') flightTicketsBooked += 1;
    if (
      accommodation?.requirement_status === 'Hostel Reserved' ||
      accommodation?.requirement_status === 'Off-campus Accommodation Reserved'
    ) {
      accommodationReserved += 1;
    }
  }

  return {
    totalStudents: records.length,
    admissionConfirmed,
    admissionFeePaid,
    compilingVisaDocuments,
    eligibleForVisa,
    flightTicketsBooked,
    accommodationReserved
  };
}

export async function getDashboardChartsService(user) {
  const counselorScopeId = user.role === ROLES.COUNSELOR ? user.id : null;
  const { records } = await findStudents({ counselorScopeId, fetchAll: true });

  const admissionCounts = Object.fromEntries(ADMISSION_STATUSES.map((s) => [s, 0]));
  const visaCounts = Object.fromEntries(VISA_DOC_STATUSES.map((s) => [s, 0]));
  const flightCounts = Object.fromEntries(FLIGHT_STATUSES.map((s) => [s, 0]));
  const accommodationCounts = Object.fromEntries(ACCOMMODATION_REQUIREMENTS.map((s) => [s, 0]));
  const monthlyMap = new Map();

  for (const s of records) {
    const admission = Array.isArray(s.admission) ? s.admission[0] : s.admission;
    const visa = Array.isArray(s.visa) ? s.visa[0] : s.visa;
    const flight = getLatestRecord(s.flights);
    const accommodation = getLatestRecord(s.accommodations);

    const admStatus = admission?.status || 'Application Pending';
    admissionCounts[admStatus] = (admissionCounts[admStatus] || 0) + 1;

    const vStatus = visa?.doc_status || 'Not Started';
    visaCounts[vStatus] = (visaCounts[vStatus] || 0) + 1;

    const fStatus = flight?.flight_status || 'Not Booked';
    flightCounts[fStatus] = (flightCounts[fStatus] || 0) + 1;

    const aStatus = accommodation?.requirement_status || 'Hostel Required';
    accommodationCounts[aStatus] = (accommodationCounts[aStatus] || 0) + 1;

    const appDate = s.application_date || s.created_at;
    if (appDate) {
      const monthKey = String(appDate).slice(0, 7); // YYYY-MM
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, applications: 0, confirmed: 0 });
      }
      const entry = monthlyMap.get(monthKey);
      entry.applications += 1;
      if (admStatus === 'Admission Confirmed') {
        entry.confirmed += 1;
      }
    }
  }

  const monthlyTrends = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return {
    admissionDistribution: Object.entries(admissionCounts).map(([name, value]) => ({ name, value })),
    visaProcessing: Object.entries(visaCounts).map(([name, value]) => ({ name, value })),
    flightStatistics: Object.entries(flightCounts).map(([name, value]) => ({ name, value })),
    accommodationDistribution: Object.entries(accommodationCounts).map(([name, value]) => ({ name, value })),
    monthlyTrends
  };
}

export async function getRecentDashboardActivityService(user) {
  const counselorScopeId = user.role === ROLES.COUNSELOR ? user.id : null;
  let counselorStudentIds = null;
  if (counselorScopeId) {
    const { records } = await findStudents({ counselorScopeId, fetchAll: true });
    counselorStudentIds = records.map((s) => s.id);
  }
  const { data } = await listActivityLogs({ page: 1, limit: 15, counselorStudentIds });
  return data;
}

