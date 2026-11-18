import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { EffectivePermissions } from '../types/index.js';
import { UserRole } from '@prisma/client';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    if (req.user.role === 'admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return sendError(
      res,
      `Access denied. Role '${req.user.role}' is not authorized for this action`,
      403,
      'FORBIDDEN_ROLE'
    );
  };
}

export function requirePermission(permissionKey: keyof Omit<EffectivePermissions, 'isCustomOverride'>) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    // Super Admin has full unrestricted override
    if (req.user.role === 'admin') {
      return next();
    }

    const hasPermission = req.permissions && req.permissions[permissionKey];
    if (hasPermission) {
      return next();
    }

    return sendError(
      res,
      `Access denied. You do not possess the required permission '${permissionKey}'`,
      403,
      'PERMISSION_DENIED'
    );
  };
}
