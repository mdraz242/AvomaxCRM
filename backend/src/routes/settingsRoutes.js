import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import { getSettings, updateSettings } from '../controllers/staffController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema } from '../validators/staffValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.put('/', authorize(ROLES.SUPER_ADMIN), validate(updateSettingsSchema), updateSettings);

export default router;

