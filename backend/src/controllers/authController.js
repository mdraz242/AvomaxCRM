import { env } from '../config/env.js';
import { changeUserPassword, getCurrentUser, loginUser } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { token, user } = await loginUser({
    email,
    password,
    ipAddress: req.ip
  });

  res.cookie('access_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 8 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    data: { token, user }
  });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie('access_token');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export const me = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user.id);
  res.json({
    success: true,
    data: user
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  await changeUserPassword(req.user.id, req.body);
  res.json({
    success: true,
    message: 'Password updated successfully'
  });
});

