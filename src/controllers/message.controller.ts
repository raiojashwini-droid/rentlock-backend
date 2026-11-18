import { Request, Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service.js';
import { sendSuccess } from '../utils/response.js';

export class MessageController {
  static async listThreads(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const threads = await MessageService.listThreads(req.user);
      return sendSuccess(res, threads);
    } catch (error) {
      return next(error);
    }
  }

  static async getThreadMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const threadId = parseInt(req.params.threadId, 10);
      const messages = await MessageService.getThreadMessages(threadId);
      return sendSuccess(res, messages);
    } catch (error) {
      return next(error);
    }
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const message = await MessageService.sendMessage(req.body, req.user);
      return sendSuccess(res, message, 'Message dispatched', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const threadId = parseInt(req.params.threadId, 10);
      await MessageService.markThreadRead(threadId, req.user);
      return sendSuccess(res, { markedRead: true });
    } catch (error) {
      return next(error);
    }
  }
}
