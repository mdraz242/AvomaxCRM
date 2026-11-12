import { Router } from 'express';
import {
  getActivityLogs,
  getNotifications,
  readAllNotifications,
  readNotification
} from '../controllers/activityNotificationController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uuidParamSchema } from '../validators/studentValidator.js';

const router = Router();

router.use(authenticate);

router.get('/activity-logs', getActivityLogs);
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', readAllNotifications);
router.patch('/notifications/:id/read', validate(uuidParamSchema, 'params'), readNotification);

export default router;

