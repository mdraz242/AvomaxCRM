import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import { listAdmissions, updateAdmissionStatus } from '../controllers/trackingController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { updateAdmissionStatusSchema } from '../validators/moduleValidators.js';
import { uuidParamSchema } from '../validators/studentValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', listAdmissions);
router.put(
  '/:id/status',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELOR),
  validate(uuidParamSchema, 'params'),
  validate(updateAdmissionStatusSchema),
  updateAdmissionStatus
);

export default router;

