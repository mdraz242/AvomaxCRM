import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import {
  addVisaDocument,
  deleteVisaDocument,
  listVisa,
  listVisaDocuments,
  updateVisaDocument,
  updateVisaStatus
} from '../controllers/trackingController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createVisaDocumentSchema, updateVisaStatusSchema } from '../validators/moduleValidators.js';
import { uuidParamSchema } from '../validators/studentValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', listVisa);
router.put(
  '/:id/status',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELOR),
  validate(uuidParamSchema, 'params'),
  validate(updateVisaStatusSchema),
  updateVisaStatus
);

router.get('/:id/documents', validate(uuidParamSchema, 'params'), listVisaDocuments);
router.post(
  '/:id/documents',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELOR),
  validate(uuidParamSchema, 'params'),
  validate(createVisaDocumentSchema),
  addVisaDocument
);
router.put(
  '/:id/documents/:docId',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELOR),
  updateVisaDocument
);
router.delete(
  '/:id/documents/:docId',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  deleteVisaDocument
);

export default router;

