import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { findProfileByEmail, findProfileById, findProfileWithHashById, updateStaffProfile } from '../repositories/staffRepository.js';
import { AppError } from '../utils/AppError.js';
import { logActivity } from './activityService.js';

export function signAuthToken(profile) {
  return jwt.sign(
    {
      sub: profile.id,
      role: profile.role,
      email: profile.email
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export async function loginUser({ email, password, ipAddress }) {
  const profile = await findProfileByEmail(email);
  if (!profile) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!profile.is_active) {
    throw new AppError('Your account has been deactivated. Contact a Super Admin.', 403);
  }

  const isMatch = await bcrypt.compare(password, profile.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  await updateStaffProfile(profile.id, { last_login_at: new Date().toISOString() });

  const token = signAuthToken(profile);
  const { password_hash: _removed, ...safeProfile } = profile;

  await logActivity({
    actorId: profile.id,
    entityType: 'auth',
    entityId: profile.id,
    action: 'user_login',
    description: `${profile.full_name} logged in`,
    ipAddress
  });

  return { token, user: safeProfile };
}

export async function getCurrentUser(userId) {
  const profile = await findProfileById(userId);
  if (!profile) {
    throw new AppError('User profile not found.', 404);
  }
  return profile;
}

export async function changeUserPassword(userId, { currentPassword, newPassword }) {
  const profile = await findProfileWithHashById(userId);
  if (!profile) {
    throw new AppError('User profile not found.', 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, profile.password_hash);
  if (!isMatch) {
    throw new AppError('Current password is incorrect.', 400);
  }

  const password_hash = await bcrypt.hash(newPassword, 12);
  await updateStaffProfile(userId, { password_hash });

  await logActivity({
    actorId: userId,
    entityType: 'auth',
    entityId: userId,
    action: 'password_changed',
    description: `${profile.full_name} changed their password`
  });

  return true;
}

