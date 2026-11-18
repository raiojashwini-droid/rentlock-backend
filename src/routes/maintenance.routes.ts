import { Router } from 'express';
import { MaintenanceController } from '../controllers/maintenance.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  createTicketSchema,
  triageTicketSchema,
  createPreventiveScheduleSchema,
} from '../validators/maintenance.validator.js';

const router = Router();

router.use(authenticateToken);

// Work Orders
router.get('/', MaintenanceController.list);
router.get('/:id', MaintenanceController.getById);
router.post('/', validateBody(createTicketSchema), MaintenanceController.create);
router.patch('/:id/triage', validateBody(triageTicketSchema), MaintenanceController.triage);
router.patch('/:id/approve', requireRole('admin'), MaintenanceController.approve);

// Preventive Maintenance
router.get('/preventive/all', MaintenanceController.listPreventive);
router.post('/preventive', validateBody(createPreventiveScheduleSchema), MaintenanceController.createPreventive);
router.put('/preventive/:id', MaintenanceController.updatePreventive);
router.delete('/preventive/:id', requireRole('admin'), MaintenanceController.deletePreventive);

export default router;
