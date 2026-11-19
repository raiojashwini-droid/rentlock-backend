import { Request, Response, NextFunction } from 'express';
import { UnitService } from '../services/unit.service.js';
import { sendSuccess, sendPaginated, sendError } from '../utils/response.js';

export class UnitController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { items, total, page, limit } = await UnitService.listUnits(req.query);
      return sendPaginated(res, items, total, page, limit);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendError(res, 'Invalid unit ID', 400);
      }
      const unit = await UnitService.getUnitById(id);
      return sendSuccess(res, unit);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const unit = await UnitService.createUnit(req.body);
      return sendSuccess(res, unit, 'Unit created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendError(res, 'Invalid unit ID', 400);
      }
      const unit = await UnitService.updateUnit(id, req.body);
      return sendSuccess(res, unit, 'Unit updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendError(res, 'Invalid unit ID', 400);
      }
      await UnitService.deleteUnit(id);
      return sendSuccess(res, { id }, 'Unit deleted successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const types = await UnitService.getUnitTypes();
      return sendSuccess(res, types);
    } catch (error) {
      return next(error);
    }
  }

  static async addType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      const types = await UnitService.addUnitType(name);
      return sendSuccess(res, types, 'Unit type added successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async removeType(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.params;
      const types = await UnitService.removeUnitType(decodeURIComponent(name));
      return sendSuccess(res, types, 'Unit type removed successfully');
    } catch (error) {
      return next(error);
    }
  }
}
