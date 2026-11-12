import { Router } from 'express';
import { exportReport, getReport } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/:type/export', exportReport);
router.get('/:type', getReport);

export default router;

