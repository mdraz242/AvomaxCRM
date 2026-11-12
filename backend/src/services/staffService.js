import bcrypt from 'bcrypt';
import {
  createStaffProfile,
  findProfileByEmail,
  findProfileById,
  listStaffProfiles,
  updateStaffProfile
} from '../repositories/staffRepository.js';
import { AppError } from '../utils/AppError.js';
import { sanitizeText } from '../utils/sanitize.js';
import { logActivity } from './activityService.js';

export async function listStaffService(query) {
  const isActive =
    query.is_active === 'true' ? true : query.is_active === 'false' ? false : undefined;
  return listStaffProfiles({
    role: query.role,
    is_active: isActive,
    search: query.search
  });
}

export async function createStaffService(payload, actorId, ipAddress) {
  const existing = await findProfileByEmail(payload.email);
  if (existing) {
    throw new AppError('A staff account with this email already exists.', 409);
  }

  const password_hash = await bcrypt.hash(payload.password, 12);
  const created = await createStaffProfile({
    full_name: sanitizeText(payload.full_name),
    email: payload.email.toLowerCase().trim(),
    password_hash,
    role: payload.role,
    phone: payload.phone ? sanitizeText(payload.phone) : null,
    department: payload.department ? sanitizeText(payload.department) : null,
    is_active: payload.is_active ?? true
  });

  await logActivity({
    actorId,
    entityType: 'staff',
    entityId: created.id,
    action: 'staff_created',
    description: `Created staff account for ${created.full_name} (${created.role})`,
    ipAddress
  });

  return created;
}

export async function updateStaffService(id, payload, actorId, ipAddress) {
  const existing = await findProfileById(id);
  if (!existing) {
    throw new AppError('Staff member not found.', 404);
  }

  if (id === actorId && payload.is_active === false) {
    throw new AppError('You cannot deactivate your own account.', 400);
  }

  const updates = {};
  if (payload.full_name !== undefined) updates.full_name = sanitizeText(payload.full_name);
  if (payload.role !== undefined) updates.role = payload.role;
  if (payload.phone !== undefined) updates.phone = payload.phone ? sanitizeText(payload.phone) : null;
  if (payload.department !== undefined) updates.department = payload.department ? sanitizeText(payload.department) : null;
  if (payload.is_active !== undefined) updates.is_active = payload.is_active;
  if (payload.password) updates.password_hash = await bcrypt.hash(payload.password, 12);

  const updated = await updateStaffProfile(id, updates);

  await logActivity({
    actorId,
    entityType: 'staff',
    entityId: id,
    action: 'staff_updated',
    description: `Updated staff account for ${updated.full_name}`,
    metadata: { updatedFields: Object.keys(updates).filter((k) => k !== 'password_hash') },
    ipAddress
  });

  return updated;
}

