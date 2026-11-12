import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import {
  deleteDocument,
  getDocumentVersions,
  getSignedUrl,
  getStudentDocuments,
  listDocuments,
  uploadDocument,
  verifyDocument
} from '../controllers/documentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { uploadSingleDocument } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { uploadDocumentMetaSchema, verifyDocumentSchema } from '../validators/documentValidator.js';
import { uuidParamSchema } from '../validators/studentValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', listDocuments);
router.post(
  '/upload',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELOR),
  uploadSingleDocument,
  validate(uploadDocumentMetaSchema),
  uploadDocument
);
router.get('/file/:id/signed-url', validate(uuidParamSchema, 'params'), getSignedUrl);
router.get('/file/:id/versions', validate(uuidParamSchema, 'params'), getDocumentVersions);
router.put(
  '/:id/verify',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELOR),
  validate(uuidParamSchema, 'params'),
  validate(verifyDocumentSchema),
  verifyDocument
);
router.get('/:studentId', getStudentDocuments);
router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(uuidParamSchema, 'params'),
  deleteDocument
);

export default router;

