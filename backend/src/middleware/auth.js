import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getSupabase } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const cookieToken = req.cookies?.access_token || null;
  const token = bearerToken || cookieToken;

  if (!token) {
    throw new AppError('Authentication required. Please log in.', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Session expired. Please log in again.', 401);
    }
    throw new AppError('Invalid authentication token.', 401);
  }

  const supabase = getSupabase();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, phone, department, is_active')
    .eq('id', decoded.sub)
    .single();

  if (error || !profile) {
    throw new AppError('Authenticated user account not found.', 401);
  }

  if (!profile.is_active) {
    throw new AppError('Your account has been deactivated. Contact a Super Admin.', 403);
  }

  req.user = profile;
  next();
});

