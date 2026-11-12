import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import { createPayment, listPayments, updatePayment } from '../controllers/trackingController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createPaymentSchema, updatePaymentSchema } from '../validators/moduleValidators.js';
import { uuidParamSchema } from '../validators/studentValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', listPayments);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(createPaymentSchema), createPayment);
router.put(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(uuidParamSchema, 'params'),
  validate(updatePaymentSchema),
  updatePayment
);

export default router;

