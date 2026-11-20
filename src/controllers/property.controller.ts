import { Request, Response, NextFunction } from 'express';
import { PropertyService } from '../services/property.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export class PropertyController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { items, total, page, limit } = await PropertyService.listProperties(req.query, req.user);
      return sendPaginated(res, items, total, page, limit);
    } catch (error) {
      return next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const property = await PropertyService.getPropertyById(id);
      return sendSuccess(res, property);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const property = await PropertyService.createProperty(req.body);
      return sendSuccess(res, property, 'Property created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const property = await PropertyService.updateProperty(id, req.body);
      return sendSuccess(res, property, 'Property updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await PropertyService.deleteProperty(id);
      return sendSuccess(res, { id }, 'Property deleted successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const propertyId = parseInt(req.params.id, 10);
      const doc = await PropertyService.uploadDocument(propertyId, {
        name: req.body.name || 'Building_Document.pdf',
        category: req.body.category || 'General',
        fileUrl: req.body.fileUrl || 'https://storage.rentlock.com/docs/sample.pdf',
        uploadedBy: req.user?.name || 'Staff',
      });
      return sendSuccess(res, doc, 'Document uploaded successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async listDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const propertyId = parseInt(req.params.id, 10);
      const docs = await PropertyService.listDocuments(propertyId);
      return sendSuccess(res, docs);
    } catch (error) {
      return next(error);
    }
  }

  // Portfolio Groups
  static async listPortfolios(req: Request, res: Response, next: NextFunction) {
    try {
      const portfolios = await PropertyService.listPortfolios();
      return sendSuccess(res, portfolios);
    } catch (error) {
      return next(error);
    }
  }

  static async createPortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PropertyService.createPortfolio(req.body.name);
      return sendSuccess(res, result, 'Portfolio group created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async deletePortfolio(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PropertyService.deletePortfolio(req.params.name);
      return sendSuccess(res, result, 'Portfolio group removed successfully');
    } catch (error) {
      return next(error);
    }
  }
}
