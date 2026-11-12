import { ROLES } from '../config/constants.js';
import { getCounselorStudentIds } from '../repositories/studentRepository.js';
import { listActivityLogs } from '../services/activityService.js';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';

export const getActivityLogs = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  let counselorStudentIds = null;

  if (req.user.role === ROLES.COUNSELOR) {
    counselorStudentIds = await getCounselorStudentIds(req.user.id);
  }

  const { data, count } = await listActivityLogs({
    page,
    limit,
    studentId: req.query.student_id,
    entityType: req.query.entity_type,
    action: req.query.action,
    counselorStudentIds
  });

  res.json({
    success: true,
    data,
    pagination: buildPaginationMeta({ total: count, page, limit })
  });
});

export const getNotifications = asyncHandler(async (req, res) => {
  const unreadOnly = req.query.unread_only === 'true';
  const data = await listNotifications(req.user.id, { unreadOnly });
  res.json({ success: true, data });
});

export const readNotification = asyncHandler(async (req, res) => {
  const data = await markNotificationRead(req.user.id, req.params.id);
  res.json({ success: true, data });
});

export const readAllNotifications = asyncHandler(async (req, res) => {
  await markAllNotificationsRead(req.user.id);
  res.json({ success: true, message: 'All notifications marked as read' });
});

