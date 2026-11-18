import { Router } from 'express';
import { PropertyController } from '../controllers/property.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { createPropertySchema, updatePropertySchema } from '../validators/property.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('canViewProperties'), PropertyController.list);
router.get('/:id', requirePermission('canViewProperties'), PropertyController.getById);
router.post('/', requirePermission('canAddProperties'), validateBody(createPropertySchema), PropertyController.create);
router.put('/:id', requirePermission('canEditProperties'), validateBody(updatePropertySchema), PropertyController.update);
router.delete('/:id', requirePermission('canDeleteProperties'), PropertyController.delete);

// Property Attached Documents
router.post('/:id/documents', PropertyController.uploadDocument);
router.get('/:id/documents', PropertyController.listDocuments);

export default router;
