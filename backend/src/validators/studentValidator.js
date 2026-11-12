import { z } from 'zod';
import { GENDERS } from '../config/constants.js';

const optionalNullableUuid = z.union([z.string().uuid(), z.literal(''), z.null()]).optional().transform((v) => (v === '' ? null : v));

export const createStudentSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required').max(150),
  email: z.string().trim().email('Valid email address is required'),
  phone: z.string().trim().min(5, 'Phone number is required').max(40),
  whatsapp_number: z.string().trim().max(40).optional().nullable(),
  passport_number: z.string().trim().min(4, 'Passport number is required').max(64),
  nationality: z.string().trim().min(2, 'Nationality is required').max(100),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  gender: z.enum(GENDERS).default('Prefer not to say'),
  passport_expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Passport expiry date must be YYYY-MM-DD'),
  destination_country: z.string().trim().min(2, 'Destination country is required').max(100),
  university_name: z.string().trim().min(2, 'University name is required').max(200),
  course_name: z.string().trim().min(2, 'Course name is required').max(200),
  intake: z.string().trim().min(2, 'Intake is required').max(60),
  academic_year: z.string().trim().min(4, 'Academic year is required').max(30),
  assigned_counselor_id: optionalNullableUuid,
  application_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  internal_remarks: z.string().trim().max(2000).optional().nullable()
});

export const updateStudentSchema = createStudentSchema.partial();

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID identifier')
});

