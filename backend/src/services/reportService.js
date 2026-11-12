import { ROLES } from '../config/constants.js';
import { findStudents, getLatestRecord } from '../repositories/studentRepository.js';
import { AppError } from '../utils/AppError.js';
import { formatStudentRecord } from './studentService.js';

export const REPORT_TYPES = [
  'student-admission',
  'fee-collection',
  'pending-payment',
  'visa-processing',
  'visa-eligibility',
  'flight-booking',
  'accommodation',
  'country-wise',
  'counselor-performance'
];

export async function generateReportService(reportType, query, user) {
  if (!REPORT_TYPES.includes(reportType)) {
    throw new AppError(`Unknown report type: ${reportType}`, 400);
  }

  const counselorScopeId = user.role === ROLES.COUNSELOR ? user.id : null;
  const { records } = await findStudents({
    ...query,
    counselorScopeId,
    fetchAll: true
  });

  const formatted = records.map(formatStudentRecord);

  switch (reportType) {
    case 'student-admission':
      return {
        title: 'Student Admission Report',
        columns: ['Student ID', 'Full Name', 'Country', 'University', 'Course', 'Intake', 'Admission Status', 'Counselor', 'Progress %'],
        rows: formatted.map((s) => ({
          'Student ID': s.student_code,
          'Full Name': s.full_name,
          Country: s.destination_country,
          University: s.university_name,
          Course: s.course_name,
          Intake: `${s.intake} (${s.academic_year})`,
          'Admission Status': s.admission?.status || 'Application Pending',
          Counselor: s.counselor?.full_name || 'Unassigned',
          'Progress %': `${s.progress.overallPercentage}%`
        }))
      };

    case 'fee-collection':
      return {
        title: 'Fee Collection Report',
        columns: ['Student ID', 'Full Name', 'University', 'Currency', 'Total Fee', 'Amount Paid', 'Outstanding', 'Payment Status', 'Payment Date', 'Reference'],
        rows: formatted.map((s) => {
          const p = s.latest_payment;
          return {
            'Student ID': s.student_code,
            'Full Name': s.full_name,
            University: s.university_name,
            Currency: p?.currency || 'USD',
            'Total Fee': Number(p?.total_fee || 0),
            'Amount Paid': Number(p?.amount_paid || 0),
            Outstanding: Number(p?.outstanding_amount || 0),
            'Payment Status': p?.payment_status || 'Pending',
            'Payment Date': p?.payment_date || '-',
            Reference: p?.payment_reference || '-'
          };
        })
      };

    case 'pending-payment':
      return {
        title: 'Pending Payment Report',
        columns: ['Student ID', 'Full Name', 'Email', 'Phone', 'Currency', 'Total Fee', 'Amount Paid', 'Outstanding', 'Payment Status', 'Counselor'],
        rows: formatted
          .filter((s) => ['Pending', 'Partially Paid'].includes(s.latest_payment?.payment_status || 'Pending'))
          .map((s) => {
            const p = s.latest_payment;
            return {
              'Student ID': s.student_code,
              'Full Name': s.full_name,
              Email: s.email,
              Phone: s.phone,
              Currency: p?.currency || 'USD',
              'Total Fee': Number(p?.total_fee || 0),
              'Amount Paid': Number(p?.amount_paid || 0),
              Outstanding: Number(p?.outstanding_amount || 0),
              'Payment Status': p?.payment_status || 'Pending',
              Counselor: s.counselor?.full_name || 'Unassigned'
            };
          })
      };

    case 'visa-processing':
      return {
        title: 'Visa Processing Report',
        columns: ['Student ID', 'Full Name', 'Destination Country', 'Visa Doc Status', 'Eligibility Status', 'Submission Date', 'Visa Reference', 'Counselor'],
        rows: formatted.map((s) => ({
          'Student ID': s.student_code,
          'Full Name': s.full_name,
          'Destination Country': s.destination_country,
          'Visa Doc Status': s.visa?.doc_status || 'Not Started',
          'Eligibility Status': s.visa?.eligibility_status || 'Not Evaluated',
          'Submission Date': s.visa?.submission_date || '-',
          'Visa Reference': s.visa?.visa_reference || '-',
          Counselor: s.counselor?.full_name || 'Unassigned'
        }))
      };

    case 'visa-eligibility':
      return {
        title: 'Visa Eligibility Report',
        columns: ['Student ID', 'Full Name', 'Country', 'Eligibility Status', 'Verification Date', 'Verified By', 'Remarks'],
        rows: formatted.map((s) => ({
          'Student ID': s.student_code,
          'Full Name': s.full_name,
          Country: s.destination_country,
          'Eligibility Status': s.visa?.eligibility_status || 'Not Evaluated',
          'Verification Date': s.visa?.verification_date || '-',
          'Verified By': s.visa?.verified_by_profile?.full_name || '-',
          Remarks: s.visa?.eligibility_remarks || '-'
        }))
      };

    case 'flight-booking':
      return {
        title: 'Flight Booking Report',
        columns: ['Student ID', 'Full Name', 'Destination Country', 'Flight Status', 'Airline', 'Flight Number', 'Departure Date', 'Route', 'Booking Reference'],
        rows: formatted.map((s) => {
          const f = s.latest_flight;
          return {
            'Student ID': s.student_code,
            'Full Name': s.full_name,
            'Destination Country': s.destination_country,
            'Flight Status': f?.flight_status || 'Not Booked',
            Airline: f?.airline || '-',
            'Flight Number': f?.flight_number || '-',
            'Departure Date': f?.departure_date ? String(f.departure_date).slice(0, 10) : '-',
            Route: f?.departure_airport || f?.arrival_airport ? `${f?.departure_airport || '?'} -> ${f?.arrival_airport || '?'}` : '-',
            'Booking Reference': f?.booking_reference || '-'
          };
        })
      };

    case 'accommodation':
      return {
        title: 'Accommodation Report',
        columns: ['Student ID', 'Full Name', 'Requirement Status', 'Payment Status', 'Provider', 'Property Name', 'Check-in', 'Check-out', 'Amount'],
        rows: formatted.map((s) => {
          const a = s.latest_accommodation;
          return {
            'Student ID': s.student_code,
            'Full Name': s.full_name,
            'Requirement Status': a?.requirement_status || 'Hostel Required',
            'Payment Status': a?.payment_status || 'Paid Upon Arrival',
            Provider: a?.provider || '-',
            'Property Name': a?.property_name || '-',
            'Check-in': a?.check_in_date || '-',
            'Check-out': a?.check_out_date || '-',
            Amount: a?.payment_amount ? `${a.currency || 'USD'} ${a.payment_amount}` : '-'
          };
        })
      };

    case 'country-wise': {
      const countryMap = new Map();
      for (const s of formatted) {
        const key = s.destination_country || 'Unknown';
        if (!countryMap.has(key)) {
          countryMap.set(key, {
            Country: key,
            'Total Students': 0,
            'Admission Confirmed': 0,
            'Fee Paid': 0,
            'Visa Eligible': 0,
            'Flight Booked': 0,
            'Accommodation Reserved': 0
          });
        }
        const row = countryMap.get(key);
        row['Total Students'] += 1;
        if (s.admission?.status === 'Admission Confirmed') row['Admission Confirmed'] += 1;
        if (s.latest_payment?.payment_status === 'Paid') row['Fee Paid'] += 1;
        if (s.visa?.eligibility_status === 'Eligible to Proceed with Visa') row['Visa Eligible'] += 1;
        if (s.latest_flight?.flight_status === 'Flight Ticket Booked') row['Flight Booked'] += 1;
        if (['Hostel Reserved', 'Off-campus Accommodation Reserved'].includes(s.latest_accommodation?.requirement_status)) {
          row['Accommodation Reserved'] += 1;
        }
      }
      return {
        title: 'Country-wise Student Report',
        columns: ['Country', 'Total Students', 'Admission Confirmed', 'Fee Paid', 'Visa Eligible', 'Flight Booked', 'Accommodation Reserved'],
        rows: Array.from(countryMap.values()).sort((a, b) => b['Total Students'] - a['Total Students'])
      };
    }

    case 'counselor-performance': {
      const counselorMap = new Map();
      for (const s of formatted) {
        const key = s.counselor?.id || 'unassigned';
        if (!counselorMap.has(key)) {
          counselorMap.set(key, {
            Counselor: s.counselor?.full_name || 'Unassigned',
            Email: s.counselor?.email || '-',
            'Assigned Students': 0,
            'Admissions Confirmed': 0,
            'Visa Eligible': 0,
            'Flights Booked': 0,
            totalProgress: 0
          });
        }
        const row = counselorMap.get(key);
        row['Assigned Students'] += 1;
        if (s.admission?.status === 'Admission Confirmed') row['Admissions Confirmed'] += 1;
        if (s.visa?.eligibility_status === 'Eligible to Proceed with Visa') row['Visa Eligible'] += 1;
        if (s.latest_flight?.flight_status === 'Flight Ticket Booked') row['Flights Booked'] += 1;
        row.totalProgress += s.progress.overallPercentage;
      }

      return {
        title: 'Counselor Performance Report',
        columns: ['Counselor', 'Email', 'Assigned Students', 'Admissions Confirmed', 'Visa Eligible', 'Flights Booked', 'Avg Progress %'],
        rows: Array.from(counselorMap.values()).map(({ totalProgress, ...rest }) => ({
          ...rest,
          'Avg Progress %': `${Math.round(totalProgress / rest['Assigned Students'])}%`
        }))
      };
    }

    default:
      return { title: 'Report', columns: [], rows: [] };
  }
}

export function buildStudentsExportRows(records) {
  return records.map((raw) => {
    const s = formatStudentRecord(raw);
    const p = getLatestRecord(raw.fee_payments);
    const f = getLatestRecord(raw.flights);
    const a = getLatestRecord(raw.accommodations);
    return {
      'Student ID': s.student_code,
      'Full Name': s.full_name,
      Email: s.email,
      Phone: s.phone,
      WhatsApp: s.whatsapp_number || '-',
      Passport: s.passport_number,
      Nationality: s.nationality,
      Country: s.destination_country,
      University: s.university_name,
      Course: s.course_name,
      Intake: s.intake,
      'Academic Year': s.academic_year,
      Counselor: s.counselor?.full_name || 'Unassigned',
      'Admission Status': s.admission?.status || 'Application Pending',
      'Fee Status': p?.payment_status || 'Pending',
      'Visa Doc Status': s.visa?.doc_status || 'Not Started',
      'Visa Eligibility': s.visa?.eligibility_status || 'Not Evaluated',
      'Flight Status': f?.flight_status || 'Not Booked',
      Accommodation: a?.requirement_status || 'Hostel Required',
      'Progress %': `${s.progress.overallPercentage}%`
    };
  });
}

