import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import { createStaff, listCounselors, listStaff, updateStaff } from '../controllers/staffController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createStaffSchema, updateStaffSchema } from '../validators/staffValidator.js';
import { uuidParamSchema } from '../validators/studentValidator.js';

const router = Router();

router.use(authenticate);

router.get('/counselors', listCounselors);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), listStaff);
router.post('/', authorize(ROLES.SUPER_ADMIN), validate(createStaffSchema), createStaff);
router.put(
  '/:id',
  authorize(ROLES.SUPER_ADMIN),
  validate(uuidParamSchema, 'params'),
  validate(updateStaffSchema),
  updateStaff
);

export default router;

