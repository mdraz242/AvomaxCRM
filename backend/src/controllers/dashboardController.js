import {
  getDashboardChartsService,
  getDashboardStatsService,
  getRecentDashboardActivityService
} from '../services/dashboardService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStats = asyncHandler(async (req, res) => {
  const data = await getDashboardStatsService(req.user);
  res.json({ success: true, data });
});

export const getCharts = asyncHandler(async (req, res) => {
  const data = await getDashboardChartsService(req.user);
  res.json({ success: true, data });
});

export const getRecentActivity = asyncHandler(async (req, res) => {
  const data = await getRecentDashboardActivityService(req.user);
  res.json({ success: true, data });
});

