import { getAllSettings, upsertSetting } from '../repositories/settingsRepository.js';
import { logActivity } from '../services/activityService.js';
import { createStaffService, listStaffService, updateStaffService } from '../services/staffService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listStaff = asyncHandler(async (req, res) => {
  const data = await listStaffService(req.query);
  res.json({ success: true, data });
});

export const listCounselors = asyncHandler(async (_req, res) => {
  const data = await listStaffService({ is_active: 'true' });
  res.json({
    success: true,
    data: data.filter((s) => ['counselor', 'admin', 'super_admin'].includes(s.role))
  });
});

export const createStaff = asyncHandler(async (req, res) => {
  const data = await createStaffService(req.body, req.user.id, req.ip);
  res.status(201).json({ success: true, data });
});

export const updateStaff = asyncHandler(async (req, res) => {
  const data = await updateStaffService(req.params.id, req.body, req.user.id, req.ip);
  res.json({ success: true, data });
});

export const getSettings = asyncHandler(async (_req, res) => {
  const rows = await getAllSettings();
  const settings = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
  res.json({ success: true, data: settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const entries = Object.entries(req.body.settings || {});
  const results = [];
  for (const [key, value] of entries) {
    const saved = await upsertSetting(key, value, req.user.id);
    results.push(saved);
  }
  await logActivity({
    actorId: req.user.id,
    entityType: 'settings',
    action: 'settings_updated',
    description: `Updated system settings (${entries.map(([k]) => k).join(', ')})`,
    ipAddress: req.ip
  });
  res.json({ success: true, data: results });
});

