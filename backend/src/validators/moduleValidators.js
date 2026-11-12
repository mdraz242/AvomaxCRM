import { z } from 'zod';
import {
  ACCOMMODATION_PAYMENT_STATUSES,
  ACCOMMODATION_REQUIREMENTS,
  ADMISSION_STATUSES,
  DOCUMENT_VERIFICATION_STATUSES,
  FEE_STATUSES,
  FLIGHT_STATUSES,
  VISA_DOC_STATUSES,
  VISA_ELIGIBILITY_STATUSES
} from '../config/constants.js';

const emptyToNull = (v) => (v === '' ? null : v);
const optionalUuid = z.union([z.string().uuid(), z.literal(''), z.null()]).optional().transform(emptyToNull);
const optionalDate = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()]).optional().transform(emptyToNull);

export const updateAdmissionStatusSchema = z.object({
  status: z.enum(ADMISSION_STATUSES),
  offer_reference: z.string().trim().max(120).optional().nullable(),
  offer_received_date: optionalDate,
  decision_date: optionalDate,
  remarks: z.string().trim().max(2000).optional().nullable()
});

export const createPaymentSchema = z.object({
  student_id: z.string().uuid('Valid student_id is required'),
  payment_status: z.enum(FEE_STATUSES).default('Pending'),
  currency: z.string().trim().min(3).max(10).default('USD'),
  total_fee: z.coerce.number().min(0, 'Total fee cannot be negative'),
  amount_paid: z.coerce.number().min(0, 'Amount paid cannot be negative'),
  payment_date: optionalDate,
  payment_reference: z.string().trim().max(120).optional().nullable(),
  receipt_document_id: optionalUuid,
  remarks: z.string().trim().max(2000).optional().nullable()
}).refine((data) => data.total_fee === 0 || data.amount_paid <= data.total_fee, {
  message: 'Amount paid cannot exceed total admission fee',
  path: ['amount_paid']
});

export const updatePaymentSchema = z.object({
  payment_status: z.enum(FEE_STATUSES).optional(),
  currency: z.string().trim().min(3).max(10).optional(),
  total_fee: z.coerce.number().min(0).optional(),
  amount_paid: z.coerce.number().min(0).optional(),
  payment_date: optionalDate,
  payment_reference: z.string().trim().max(120).optional().nullable(),
  receipt_document_id: optionalUuid,
  remarks: z.string().trim().max(2000).optional().nullable()
});

export const updateVisaStatusSchema = z.object({
  doc_status: z.enum(VISA_DOC_STATUSES).optional(),
  eligibility_status: z.enum(VISA_ELIGIBILITY_STATUSES).optional(),
  eligibility_remarks: z.string().trim().max(2000).optional().nullable(),
  verification_date: optionalDate,
  submission_date: optionalDate,
  visa_reference: z.string().trim().max(120).optional().nullable(),
  remarks: z.string().trim().max(2000).optional().nullable()
});

export const createVisaDocumentSchema = z.object({
  document_name: z.string().trim().min(2).max(180),
  document_id: optionalUuid,
  is_mandatory: z.boolean().default(true),
  status: z.enum(DOCUMENT_VERIFICATION_STATUSES).default('Pending'),
  remarks: z.string().trim().max(1000).optional().nullable()
});

export const createFlightSchema = z.object({
  student_id: z.string().uuid('Valid student_id is required'),
  flight_status: z.enum(FLIGHT_STATUSES).default('Not Booked'),
  airline: z.string().trim().max(120).optional().nullable(),
  flight_number: z.string().trim().max(50).optional().nullable(),
  departure_date: z.union([z.string(), z.literal(''), z.null()]).optional().transform(emptyToNull),
  departure_airport: z.string().trim().max(120).optional().nullable(),
  arrival_airport: z.string().trim().max(120).optional().nullable(),
  booking_reference: z.string().trim().max(100).optional().nullable(),
  ticket_document_id: optionalUuid,
  remarks: z.string().trim().max(2000).optional().nullable()
});

export const updateFlightSchema = createFlightSchema.omit({ student_id: true }).partial();

export const createAccommodationSchema = z.object({
  student_id: z.string().uuid('Valid student_id is required'),
  requirement_status: z.enum(ACCOMMODATION_REQUIREMENTS).default('Hostel Required'),
  payment_status: z.enum(ACCOMMODATION_PAYMENT_STATUSES).default('Paid Upon Arrival'),
  provider: z.string().trim().max(150).optional().nullable(),
  property_name: z.string().trim().max(200).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  check_in_date: optionalDate,
  check_out_date: optionalDate,
  payment_amount: z.coerce.number().min(0).optional().default(0),
  currency: z.string().trim().min(3).max(10).default('USD'),
  booking_confirmation: z.string().trim().max(150).optional().nullable(),
  confirmation_document_id: optionalUuid,
  remarks: z.string().trim().max(2000).optional().nullable()
});

export const updateAccommodationSchema = createAccommodationSchema.omit({ student_id: true }).partial();

