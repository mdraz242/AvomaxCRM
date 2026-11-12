export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  COUNSELOR: 'counselor',
  VIEWER: 'viewer'
};

export const ALL_ROLES = Object.values(ROLES);

export const ADMISSION_STATUSES = [
  'Application Pending',
  'Documents Required',
  'Under Review',
  'Conditional Offer Received',
  'Unconditional Offer Received',
  'Admission Confirmed',
  'Rejected'
];

export const FEE_STATUSES = [
  'Pending',
  'Partially Paid',
  'Paid',
  'Waived'
];

export const VISA_DOC_STATUSES = [
  'Not Started',
  'Documents Pending',
  'Compiling Visa Documents',
  'Documents Ready',
  'Submitted',
  'Additional Documents Required',
  'Completed'
];

export const VISA_ELIGIBILITY_STATUSES = [
  'Not Evaluated',
  'Eligible to Proceed with Visa',
  'Not Eligible',
  'On Hold',
  'Under Review'
];

export const FLIGHT_STATUSES = [
  'Not Booked',
  'Searching for Flights',
  'Flight Ticket Booked',
  'Rescheduled',
  'Cancelled'
];

export const ACCOMMODATION_REQUIREMENTS = [
  'Hostel Required',
  'Off-campus Accommodation',
  'Hostel Reserved',
  'Off-campus Accommodation Reserved',
  'Accommodation Not Required'
];

export const ACCOMMODATION_PAYMENT_STATUSES = [
  'Paid Upon Arrival',
  'Pre-paid'
];

export const DOCUMENT_CATEGORIES = [
  'Passport',
  'Academic Certificates',
  'Transcripts',
  'Admission Letter',
  'Fee Receipt',
  'Bank Statement',
  'Financial Documents',
  'Visa Application Documents',
  'Flight Ticket',
  'Accommodation Confirmation',
  'Other Documents'
];

export const DOCUMENT_VERIFICATION_STATUSES = [
  'Pending',
  'Verified',
  'Rejected',
  'Needs Revision'
];

export const GENDERS = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say'
];

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

