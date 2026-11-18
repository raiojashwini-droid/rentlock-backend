import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, role } = req.body;
      const result = await AuthService.login(email, password, role);
      return sendSuccess(res, result, 'Login successful');
    } catch (error: any) {
      return sendError(res, error.message || 'Authentication failed', 401, 'INVALID_CREDENTIALS');
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const result = await AuthService.getProfile(req.user.id);
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  }

  static async logout(req: Request, res: Response) {
    return sendSuccess(res, { loggedOut: true }, 'Successfully logged out');
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      return sendSuccess(res, result);
    } catch (error: any) {
      return sendError(res, error.message || 'Invalid refresh token', 401, 'INVALID_TOKEN');
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      return sendSuccess(res, result, 'Password reset link sent to your registered email');
    } catch (error) {
      return next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      const result = await AuthService.resetPassword(token, newPassword);
      return sendSuccess(res, result, 'Password has been successfully updated');
    } catch (error) {
      return next(error);
    }
  }
}
