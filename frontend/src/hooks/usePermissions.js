import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../utils/constants.js';

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;

  return {
    role,
    isSuperAdmin: role === ROLES.SUPER_ADMIN,
    isAdmin: role === ROLES.ADMIN,
    isCounselor: role === ROLES.COUNSELOR,
    isViewer: role === ROLES.VIEWER,
    canCreateStudent: role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN,
    canDeleteStudent: role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN,
    canEditStudent: role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.COUNSELOR,
    canManagePayments: role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN,
    canDeleteDocument: role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN,
    canUploadDocument: role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.COUNSELOR,
    canUpdateTracking: role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.COUNSELOR,
    canManageStaff: role === ROLES.SUPER_ADMIN,
    canManageSettings: role === ROLES.SUPER_ADMIN
  };
}

