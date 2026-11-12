import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import {
  createAccommodation,
  listAccommodations,
  updateAccommodation
} from '../controllers/trackingController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createAccommodationSchema, updateAccommodationSchema } from '../validators/moduleValidators.js';
import { uuidParamSchema } from '../validators/studentValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', listAccommodations);
router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELOR),
  validate(createAccommodationSchema),
  createAccommodation
);
router.put(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELOR),
  validate(uuidParamSchema, 'params'),
  validate(updateAccommodationSchema),
  updateAccommodation
);

export default router;

