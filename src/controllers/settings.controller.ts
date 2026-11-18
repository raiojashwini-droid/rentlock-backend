import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export class SettingsController {
  static async getUserRbac(req: Request, res: Response, next: NextFunction) {
    try {
      const email = req.params.email;
      const rbac = await SettingsService.getUserRbac(email);
      return sendSuccess(res, rbac);
    } catch (error) {
      return next(error);
    }
  }

  static async updateUserRbac(req: Request, res: Response, next: NextFunction) {
    try {
      const email = req.params.email;
      const { permissions, reason } = req.body;
      if (!req.user) throw new Error('Unauthorized');
      const updated = await SettingsService.updateUserRbac(email, permissions, reason, req.user);
      return sendSuccess(res, updated, 'User RBAC permissions override saved');
    } catch (error) {
      return next(error);
    }
  }

  static async resetUserRbac(req: Request, res: Response, next: NextFunction) {
    try {
      const email = req.params.email;
      const { reason } = req.body;
      if (!req.user) throw new Error('Unauthorized');
      const result = await SettingsService.resetUserRbac(email, reason, req.user);
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  }

  static async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { items, total, page, limit } = await SettingsService.listAuditLogs(req.query);
      return sendPaginated(res, items, total, page, limit);
    } catch (error) {
      return next(error);
    }
  }
}
