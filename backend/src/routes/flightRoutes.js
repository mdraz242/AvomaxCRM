import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import { createFlight, listFlights, updateFlight } from '../controllers/trackingController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createFlightSchema, updateFlightSchema } from '../validators/moduleValidators.js';
import { uuidParamSchema } from '../validators/studentValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', listFlights);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELOR), validate(createFlightSchema), createFlight);
router.put(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELOR),
  validate(uuidParamSchema, 'params'),
  validate(updateFlightSchema),
  updateFlight
);

export default router;

