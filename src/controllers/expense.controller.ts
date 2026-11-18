import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from '../services/expense.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export class ExpenseController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { items, total, page, limit } = await ExpenseService.listExpenses(req.query, req.user);
      return sendPaginated(res, items, total, page, limit);
    } catch (error) {
      return next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await ExpenseService.createExpense(req.body);
      return sendSuccess(res, expense, 'Expense recorded successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const expense = await ExpenseService.updateExpense(id, req.body);
      return sendSuccess(res, expense, 'Expense updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await ExpenseService.deleteExpense(id);
      return sendSuccess(res, { id }, 'Expense deleted successfully');
    } catch (error) {
      return next(error);
    }
  }
}
