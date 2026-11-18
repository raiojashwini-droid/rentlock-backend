import { Router } from 'express';
import { PortalController } from '../controllers/portal.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  tenantPaymentSchema,
  tenantWorkOrderSchema,
  updateAccessNotesSchema,
  addTenantNoteSchema,
} from '../validators/portal.validator.js';

const router = Router();

router.use(authenticateToken);

// Owner Portal
router.get('/owner/overview', PortalController.getOwnerOverview);
router.get('/owner/disbursements', PortalController.getOwnerDisbursements);
router.get('/owner/documents', PortalController.getOwnerDocuments);
router.post('/owner/documents/:id/download-log', PortalController.logOwnerDownload);

// Tenant Portal
router.get('/tenant/balance', PortalController.getTenantBalance);
router.post('/tenant/pay', validateBody(tenantPaymentSchema), PortalController.submitTenantPayment);
router.post('/tenant/work-order', validateBody(tenantWorkOrderSchema), PortalController.submitTenantWorkOrder);

// Manager Workspace
router.get('/manager/overview', PortalController.getManagerOverview);
router.get('/manager/schedule', PortalController.getManagerSchedule);
router.put('/manager/properties/:id/access-notes', validateBody(updateAccessNotesSchema), PortalController.updateAccessNotes);
router.post('/manager/tenants/:id/notes', validateBody(addTenantNoteSchema), PortalController.addTenantNote);

export default router;
