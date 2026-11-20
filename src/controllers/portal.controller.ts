import { Request, Response, NextFunction } from 'express';
import { PortalService } from '../services/portal.service.js';
import { sendSuccess } from '../utils/response.js';

export class PortalController {
  // Owner
  static async getOwnerOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user?.id || 2;
      const data = await PortalService.getOwnerOverview(ownerId, req.user);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }

  static async getOwnerDisbursements(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user?.id || 2;
      const data = await PortalService.getOwnerDisbursements(ownerId);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }

  static async getOwnerDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user?.id || 2;
      const data = await PortalService.getOwnerDocuments(ownerId);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }

  static async logOwnerDownload(req: Request, res: Response, next: NextFunction) {
    try {
      const docId = req.params.id;
      const actorName = req.user?.name || 'Claire Bennett';
      await PortalService.logDocumentDownload(docId, actorName);
      return sendSuccess(res, { recorded: true }, 'Download audit recorded');
    } catch (error) {
      return next(error);
    }
  }

  // Tenant
  static async getTenantBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const userPayload = req.user || req.query;
      const data = await PortalService.getTenantBalance(userPayload);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }

  static async submitTenantPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const userPayload = req.user || req.body;
      const result = await PortalService.submitTenantPayment(req.body, userPayload);
      return sendSuccess(res, result, 'Rent payment posted successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async submitTenantWorkOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const userPayload = req.user || req.body;
      const ticket = await PortalService.submitTenantWorkOrder(req.body, userPayload);
      return sendSuccess(res, ticket, 'Maintenance request submitted', 201);
    } catch (error) {
      return next(error);
    }
  }

  // Manager
  static async getManagerOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const managerId = req.user?.id || 3;
      const data = await PortalService.getManagerOverview(managerId);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }

  static async getManagerSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const managerId = req.user?.id || 3;
      const data = await PortalService.getManagerSchedule(managerId);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }

  static async updateAccessNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const propertyId = parseInt(req.params.id, 10);
      const updated = await PortalService.updatePropertyAccessNotes(propertyId, req.body.accessNotes);
      return sendSuccess(res, updated, 'Property access instructions updated');
    } catch (error) {
      return next(error);
    }
  }

  static async addTenantNote(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = parseInt(req.params.id, 10);
      const updated = await PortalService.addTenantPrivateNote(tenantId, req.body.noteText);
      return sendSuccess(res, updated, 'Private resident note appended');
    } catch (error) {
      return next(error);
    }
  }
}
