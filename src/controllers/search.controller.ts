import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service.js';
import { sendSuccess } from '../utils/response.js';

export class SearchController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q || '');
      const results = await SearchService.searchAll(q);
      return sendSuccess(res, results);
    } catch (error) {
      return next(error);
    }
  }
}
