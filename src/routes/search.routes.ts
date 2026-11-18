import { Router } from 'express';
import { SearchController } from '../controllers/search.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/', SearchController.search);

export default router;
