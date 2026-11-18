import { Router } from 'express';
import { LeaseController } from '../controllers/lease.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  createLeaseSchema,
  signLeaseSchema,
  terminateLeaseSchema,
} from '../validators/lease.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/', LeaseController.list);
router.get('/:id', LeaseController.getById);
router.post('/', validateBody(createLeaseSchema), LeaseController.draft);
router.patch('/:id/sign', validateBody(signLeaseSchema), LeaseController.sign);
router.patch('/:id/terminate', validateBody(terminateLeaseSchema), LeaseController.terminate);

export default router;
