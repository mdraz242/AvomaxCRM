import { ROLES } from '../config/constants.js';
import { AppError } from '../utils/AppError.js';

/**
 * Role-based route authorization middleware.
 * Checks req.user.role against allowed roles.
 */
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Role "${req.user.role}" does not have permission for this action.`,
          403
        )
      );
    }

    return next();
  };
}

/**
 * Verifies whether the current user can read or modify a specific student record.
 * Counselors are scoped strictly to their assigned students.
 */
export function assertStudentAccess(user, student, { write = false } = {}) {
  if (!user) {
    throw new AppError('Authentication required.', 401);
  }

  if (!student || student.deleted_at) {
    throw new AppError('Student record not found.', 404);
  }

  if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
    return true;
  }

  if (user.role === ROLES.VIEWER) {
    if (write) {
      throw new AppError('Viewers have read-only access.', 403);
    }
    return true;
  }

  if (user.role === ROLES.COUNSELOR) {
    if (student.assigned_counselor_id !== user.id) {
      throw new AppError('Access denied. You can only access students assigned to you.', 403);
    }
    return true;
  }

  throw new AppError('Access denied.', 403);
}

