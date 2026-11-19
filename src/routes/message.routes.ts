import { Router } from 'express';
import { MessageController } from '../controllers/message.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { sendMessageSchema } from '../validators/portal.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/threads', MessageController.listThreads);
router.get('/threads/:threadId', MessageController.getThreadMessages);
router.get('/contact/:contactId', MessageController.getMessagesByContact);
router.post('/', validateBody(sendMessageSchema), MessageController.sendMessage);
router.patch('/threads/:threadId/read', MessageController.markRead);

export default router;
