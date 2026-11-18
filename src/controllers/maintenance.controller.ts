import { Request, Response, NextFunction } from 'express';
import { MaintenanceService } from '../services/maintenance.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export class MaintenanceController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { items, total, page, limit } = await MaintenanceService.listTickets(req.query, req.user);
      return sendPaginated(res, items, total, page, limit);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const ticket = await MaintenanceService.getTicketById(id);
      return sendSuccess(res, ticket);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await MaintenanceService.createTicket(req.body);
      return sendSuccess(res, ticket, 'Work order ticket created', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async triage(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const ticket = await MaintenanceService.triageTicket(id, req.body, req.user);
      return sendSuccess(res, ticket, 'Work order triaged successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (!req.user) throw new Error('Unauthorized');
      const ticket = await MaintenanceService.approveSpending(id, req.user);
      return sendSuccess(res, ticket, 'Work order spending cap authorized');
    } catch (error) {
      return next(error);
    }
  }

  static async listPreventive(req: Request, res: Response, next: NextFunction) {
    try {
      const schedules = await MaintenanceService.listPreventiveSchedules(req.query);
      return sendSuccess(res, schedules);
    } catch (error) {
      return next(error);
    }
  }

  static async createPreventive(req: Request, res: Response, next: NextFunction) {
    try {
      const schedule = await MaintenanceService.createPreventiveSchedule(req.body);
      return sendSuccess(res, schedule, 'Preventive schedule created', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async updatePreventive(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const schedule = await MaintenanceService.updatePreventiveSchedule(id, req.body);
      return sendSuccess(res, schedule, 'Preventive schedule updated');
    } catch (error) {
      return next(error);
    }
  }

  static async deletePreventive(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await MaintenanceService.deletePreventiveSchedule(id);
      return sendSuccess(res, { id }, 'Preventive schedule deleted');
    } catch (error) {
      return next(error);
    }
  }
}
