import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { updateRbacSchema, resetRbacSchema, updateCompanySettingsSchema } from '../validators/settings.validator.js';

const router = Router();

router.use(authenticateToken);

// Company & Operating Entity Defaults (accessible to authenticated users)
router.get('/company', SettingsController.getCompanySettings);
router.put('/company', validateBody(updateCompanySettingsSchema), SettingsController.updateCompanySettings);
router.post('/company', validateBody(updateCompanySettingsSchema), SettingsController.updateCompanySettings);

router.use(requireRole('admin'));

router.get('/rbac/:email', SettingsController.getUserRbac);
router.put('/rbac/user/:email', validateBody(updateRbacSchema), SettingsController.updateUserRbac);
router.post('/rbac/user/:email/reset', validateBody(resetRbacSchema), SettingsController.resetUserRbac);
router.get('/audit-logs', SettingsController.listAuditLogs);
router.post('/purge-data', SettingsController.purgeAllData);

export default router;
