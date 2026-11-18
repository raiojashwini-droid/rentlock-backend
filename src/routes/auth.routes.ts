import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/login', validateBody(loginSchema), AuthController.login);
router.get('/me', authenticateToken, AuthController.getProfile);
router.post('/logout', authenticateToken, AuthController.logout);
router.post('/refresh-token', validateBody(refreshTokenSchema), AuthController.refreshToken);
router.post('/forgot-password', validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), AuthController.resetPassword);

export default router;
