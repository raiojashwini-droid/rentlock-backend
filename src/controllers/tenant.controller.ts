import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenant.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export class TenantController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { items, total, page, limit } = await TenantService.listTenants(req.query, req.user);
      return sendPaginated(res, items, total, page, limit);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const tenant = await TenantService.getTenantById(id);
      return sendSuccess(res, tenant);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenant = await TenantService.createTenant(req.body);
      return sendSuccess(res, tenant, 'Tenant onboarded successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const tenant = await TenantService.updateTenant(id, req.body);
      return sendSuccess(res, tenant, 'Tenant updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await TenantService.deleteTenant(id, req.user?.name);
      return sendSuccess(res, { id }, 'Tenant deleted successfully');
    } catch (error) {
      return next(error);
    }
  }
}
