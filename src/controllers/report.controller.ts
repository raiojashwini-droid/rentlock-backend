import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service.js';
import { sendSuccess } from '../utils/response.js';

export class ReportController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const propertyId = req.query.propertyId ? Number(req.query.propertyId) : undefined;
      const summary = await ReportService.getSummary(propertyId);
      return sendSuccess(res, summary);
    } catch (error) {
      return next(error);
    }
  }

  static async getRevenueByMonth(req: Request, res: Response, next: NextFunction) {
    try {
      const propertyId = req.query.propertyId ? Number(req.query.propertyId) : undefined;
      const data = await ReportService.getRevenueByMonth(propertyId);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }

  static async getOccupancy(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getOccupancy();
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }

  static async getExpensesByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const propertyId = req.query.propertyId ? Number(req.query.propertyId) : undefined;
      const data = await ReportService.getExpensesByCategory(propertyId);
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }

  static async getCollectionEfficiency(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getCollectionEfficiency();
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  }
}
