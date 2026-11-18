import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { createExpenseSchema, updateExpenseSchema } from '../validators/billing.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/', ExpenseController.list);
router.post('/', validateBody(createExpenseSchema), ExpenseController.create);
router.put('/:id', validateBody(updateExpenseSchema), ExpenseController.update);
router.delete('/:id', ExpenseController.delete);

export default router;
