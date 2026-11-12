import { Router } from 'express';
import { ROLES } from '../config/constants.js';
import {
  createStudent,
  deleteStudent,
  exportStudents,
  getStudentById,
  listStudents,
  updateStudent
} from '../controllers/studentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createStudentSchema, updateStudentSchema, uuidParamSchema } from '../validators/studentValidator.js';

const router = Router();

router.use(authenticate);

router.get('/', listStudents);
router.get('/export', exportStudents);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), validate(createStudentSchema), createStudent);
router.get('/:id', validate(uuidParamSchema, 'params'), getStudentById);
router.put(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COUNSELOR),
  validate(uuidParamSchema, 'params'),
  validate(updateStudentSchema),
  updateStudent
);
router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(uuidParamSchema, 'params'),
  deleteStudent
);

export default router;

