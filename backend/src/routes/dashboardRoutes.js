import { Router } from 'express';
import { getCharts, getRecentActivity, getStats } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/stats', getStats);
router.get('/charts', getCharts);
router.get('/activity', getRecentActivity);

export default router;

