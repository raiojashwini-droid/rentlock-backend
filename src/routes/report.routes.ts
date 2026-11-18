import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/summary', ReportController.getSummary);
router.get('/revenue-by-month', ReportController.getRevenueByMonth);
router.get('/occupancy', ReportController.getOccupancy);
router.get('/expenses-by-category', ReportController.getExpensesByCategory);
router.get('/collection-efficiency', ReportController.getCollectionEfficiency);

export default router;
