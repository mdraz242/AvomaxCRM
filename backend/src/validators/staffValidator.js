import { z } from 'zod';
import { ALL_ROLES } from '../config/constants.js';

export const createStaffSchema = z.object({
  full_name: z.string().trim().min(2, 'Full name is required').max(150),
  email: z.string().trim().email('Valid email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[0-9]/, 'Password must include a number'),
  role: z.enum(ALL_ROLES),
  phone: z.string().trim().max(40).optional().nullable(),
  department: z.string().trim().max(100).optional().nullable(),
  is_active: z.boolean().default(true)
});

export const updateStaffSchema = z.object({
  full_name: z.string().trim().min(2).max(150).optional(),
  role: z.enum(ALL_ROLES).optional(),
  phone: z.string().trim().max(40).optional().nullable(),
  department: z.string().trim().max(100).optional().nullable(),
  is_active: z.boolean().optional(),
  password: z.string().min(8).optional()
});

export const updateSettingsSchema = z.object({
  settings: z.record(z.any())
});

