/**
 * Computes the 6-stage student journey progress.
 * Strictly counts ONLY completed stages; in-progress or blocked stages never count as complete.
 */
export function calculateStudentProgress({
  student = {},
  admission = null,
  payment = null,
  visa = null,
  flight = null,
  accommodation = null
}) {
  const counselorName = student.counselor?.full_name || 'Unassigned';

  const admissionStatus = admission?.status || 'Application Pending';
  const admissionState =
    admissionStatus === 'Admission Confirmed'
      ? 'completed'
      : admissionStatus === 'Rejected'
        ? 'blocked'
        : admissionStatus === 'Application Pending'
          ? 'not_started'
          : 'in_progress';

  const feeStatus = payment?.payment_status || 'Pending';
  const feeState =
    feeStatus === 'Paid' || feeStatus === 'Waived'
      ? 'completed'
      : feeStatus === 'Partially Paid'
        ? 'in_progress'
        : 'not_started';

  const visaDocStatus = visa?.doc_status || 'Not Started';
  const visaDocState =
    visaDocStatus === 'Completed'
      ? 'completed'
      : visaDocStatus === 'Not Started'
        ? 'not_started'
        : 'in_progress';

  const visaEligStatus = visa?.eligibility_status || 'Not Evaluated';
  const visaEligState =
    visaEligStatus === 'Eligible to Proceed with Visa'
      ? 'completed'
      : visaEligStatus === 'Not Eligible'
        ? 'blocked'
        : visaEligStatus === 'Not Evaluated'
          ? 'not_started'
          : 'in_progress';

  const flightStatus = flight?.flight_status || 'Not Booked';
  const flightState =
    flightStatus === 'Flight Ticket Booked'
      ? 'completed'
      : flightStatus === 'Cancelled'
        ? 'blocked'
        : flightStatus === 'Not Booked'
          ? 'not_started'
          : 'in_progress';

  const accStatus = accommodation?.requirement_status || 'Hostel Required';
  const accState = ['Hostel Reserved', 'Off-campus Accommodation Reserved', 'Accommodation Not Required'].includes(accStatus)
    ? 'completed'
    : !accommodation
      ? 'not_started'
      : 'in_progress';

  const stages = [
    {
      step: 1,
      key: 'admission',
      label: 'Admission Application',
      status: admissionStatus,
      state: admissionState,
      completed: admissionState === 'completed',
      responsibleStaff: admission?.updated_by_profile?.full_name || counselorName,
      lastUpdated: admission?.updated_at || student.updated_at || null,
      remarks: admission?.remarks || null
    },
    {
      step: 2,
      key: 'fee_payment',
      label: 'Admission Fee Payment',
      status: feeStatus,
      state: feeState,
      completed: feeState === 'completed',
      responsibleStaff: payment?.updated_by_profile?.full_name || counselorName,
      lastUpdated: payment?.updated_at || null,
      remarks: payment?.remarks || null
    },
    {
      step: 3,
      key: 'visa_documentation',
      label: 'Visa Documentation',
      status: visaDocStatus,
      state: visaDocState,
      completed: visaDocState === 'completed',
      responsibleStaff: visa?.updated_by_profile?.full_name || counselorName,
      lastUpdated: visa?.updated_at || null,
      remarks: visa?.remarks || null
    },
    {
      step: 4,
      key: 'visa_eligibility',
      label: 'Visa Eligibility',
      status: visaEligStatus,
      state: visaEligState,
      completed: visaEligState === 'completed',
      responsibleStaff: visa?.verified_by_profile?.full_name || visa?.updated_by_profile?.full_name || counselorName,
      lastUpdated: visa?.verification_date || visa?.updated_at || null,
      remarks: visa?.eligibility_remarks || null
    },
    {
      step: 5,
      key: 'flight_booking',
      label: 'Flight Booking',
      status: flightStatus,
      state: flightState,
      completed: flightState === 'completed',
      responsibleStaff: flight?.updated_by_profile?.full_name || counselorName,
      lastUpdated: flight?.updated_at || null,
      remarks: flight?.remarks || null
    },
    {
      step: 6,
      key: 'accommodation',
      label: 'Accommodation Arrangement',
      status: accStatus,
      state: accState,
      completed: accState === 'completed',
      responsibleStaff: accommodation?.updated_by_profile?.full_name || counselorName,
      lastUpdated: accommodation?.updated_at || null,
      remarks: accommodation?.remarks || null
    }
  ];

  const completedCount = stages.filter((s) => s.completed).length;
  const totalStages = stages.length;
  const overallPercentage = Math.round((completedCount / totalStages) * 100);

  return {
    overallPercentage,
    completedCount,
    totalStages,
    completedStages: stages.filter((s) => s.completed).map((s) => s.label),
    pendingStages: stages.filter((s) => !s.completed).map((s) => s.label),
    stages
  };
}

