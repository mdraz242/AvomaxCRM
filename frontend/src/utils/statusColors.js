const GREEN_STATUSES = new Set([
  'Admission Confirmed',
  'Paid',
  'Waived',
  'Completed',
  'Eligible to Proceed with Visa',
  'Flight Ticket Booked',
  'Hostel Reserved',
  'Off-campus Accommodation Reserved',
  'Pre-paid',
  'Verified'
]);

const YELLOW_STATUSES = new Set([
  'Pending',
  'Application Pending',
  'Documents Required',
  'Documents Pending',
  'Under Review',
  'Partially Paid',
  'Additional Documents Required',
  'On Hold',
  'Paid Upon Arrival',
  'Needs Revision'
]);

const BLUE_STATUSES = new Set([
  'Conditional Offer Received',
  'Unconditional Offer Received',
  'Compiling Visa Documents',
  'Documents Ready',
  'Submitted',
  'Searching for Flights',
  'Rescheduled',
  'Hostel Required',
  'Off-campus Accommodation'
]);

const RED_STATUSES = new Set([
  'Rejected',
  'Not Eligible',
  'Cancelled',
  'Overdue'
]);

export function getStatusBadgeStyle(status) {
  if (GREEN_STATUSES.has(status)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/10';
  }
  if (YELLOW_STATUSES.has(status)) {
    return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/10';
  }
  if (BLUE_STATUSES.has(status)) {
    return 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-600/10';
  }
  if (RED_STATUSES.has(status)) {
    return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/10';
  }
  return 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-500/10';
}

