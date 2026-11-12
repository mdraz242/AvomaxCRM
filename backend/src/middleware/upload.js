import multer from 'multer';
import { ALLOWED_MIME_TYPES } from '../config/constants.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const storage = multer.memoryStorage();

export const uploadSingleDocument = multer({
  storage,
  limits: {
    fileSize: env.maxUploadSizeBytes,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new AppError(
          'Unsupported file type. Allowed formats: PDF, JPG, PNG, WEBP, DOC, DOCX.',
          400
        )
      );
    }
    return cb(null, true);
  }
}).single('file');

