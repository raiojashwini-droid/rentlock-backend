import { Request, Response, NextFunction } from 'express';
import { BillingService } from '../services/billing.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';

export class BillingController {
  static async listInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const { items, total, page, limit } = await BillingService.listInvoices(req.query);
      return sendPaginated(res, items, total, page, limit);
    } catch (error) {
      return next(error);
    }
  }

  static async getInvoiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const invoice = await BillingService.getInvoiceById(id);
      return sendSuccess(res, invoice);
    } catch (error) {
      return next(error);
    }
  }

  static async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const invoice = await BillingService.createInvoice(req.body);
      return sendSuccess(res, invoice, 'Invoice issued successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async payInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await BillingService.payInvoice(id, req.body);
      return sendSuccess(res, result, 'Payment recorded successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async voidInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const invoice = await BillingService.voidInvoice(id, req.body.voidReason);
      return sendSuccess(res, invoice, 'Invoice voided successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async listReceipts(req: Request, res: Response, next: NextFunction) {
    try {
      const receipts = await BillingService.listReceipts(req.query);
      return sendSuccess(res, receipts);
    } catch (error) {
      return next(error);
    }
  }

  static async reverseReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await BillingService.reverseReceipt(id, req.body.reason);
      return sendSuccess(res, result, 'Receipt successfully reversed');
    } catch (error) {
      return next(error);
    }
  }

  static async getLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const rows = await BillingService.getLedger(req.query);
      return sendSuccess(res, rows);
    } catch (error) {
      return next(error);
    }
  }

  static async createAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const adjustment = await BillingService.createAdjustment(req.body);
      return sendSuccess(res, adjustment, 'Ledger adjustment posted successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async listSecurityDeposits(req: Request, res: Response, next: NextFunction) {
    try {
      const deposits = await BillingService.listSecurityDeposits(req.query);
      return sendSuccess(res, deposits);
    } catch (error) {
      return next(error);
    }
  }

  static async deductDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const deposit = await BillingService.deductDeposit(id, req.body);
      return sendSuccess(res, deposit, 'Deposit itemized deductions saved');
    } catch (error) {
      return next(error);
    }
  }

  static async refundDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const deposit = await BillingService.refundDeposit(id, req.body);
      return sendSuccess(res, deposit, 'Deposit refund released successfully');
    } catch (error) {
      return next(error);
    }
  }
}
