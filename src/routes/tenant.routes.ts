import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { createTenantSchema, updateTenantSchema } from '../validators/tenant.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('canViewTenants'), TenantController.list);
router.get('/:id', requirePermission('canViewTenants'), TenantController.getById);
router.post('/', requirePermission('canAddTenants'), validateBody(createTenantSchema), TenantController.create);
router.put('/:id', requirePermission('canEditTenants'), validateBody(updateTenantSchema), TenantController.update);
router.delete('/:id', requirePermission('canDeleteTenants'), TenantController.delete);

export default router;
