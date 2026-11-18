import { Request, Response, NextFunction } from 'express';
import { LeaseService } from '../services/lease.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export class LeaseController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { items, total, page, limit } = await LeaseService.listLeases(req.query);
      return sendPaginated(res, items, total, page, limit);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const lease = await LeaseService.getLeaseById(id);
      return sendSuccess(res, lease);
    } catch (error) {
      return next(error);
    }
  }

  static async draft(req: Request, res: Response, next: NextFunction) {
    try {
      const lease = await LeaseService.draftLease(req.body);
      return sendSuccess(res, lease, 'Lease drafted successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async sign(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const { signatureData, legalName } = req.body;
      const lease = await LeaseService.signLease(id, signatureData, legalName);
      return sendSuccess(res, lease, 'Lease executed and countersigned successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async terminate(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const { terminationDate, reason } = req.body;
      const lease = await LeaseService.terminateLease(id, terminationDate, reason);
      return sendSuccess(res, lease, 'Lease terminated successfully');
    } catch (error) {
      return next(error);
    }
  }
}
