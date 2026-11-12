import { z } from 'zod';
import { DOCUMENT_CATEGORIES, DOCUMENT_VERIFICATION_STATUSES } from '../config/constants.js';

export const uploadDocumentMetaSchema = z.object({
  student_id: z.string().uuid('Valid student_id is required'),
  category: z.enum(DOCUMENT_CATEGORIES),
  title: z.string().trim().min(2, 'Document title is required').max(200),
  document_group_id: z.string().uuid().optional(),
  verification_remarks: z.string().trim().max(1000).optional()
});

export const verifyDocumentSchema = z.object({
  verification_status: z.enum(DOCUMENT_VERIFICATION_STATUSES),
  verification_remarks: z.string().trim().max(1000).optional().nullable()
});

