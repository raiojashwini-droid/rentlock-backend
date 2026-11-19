import { Router } from 'express';
import { UnitController } from '../controllers/unit.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { createUnitSchema, updateUnitSchema } from '../validators/property.validator.js';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('canViewProperties'), UnitController.list);
router.get('/types', UnitController.getTypes);
router.post('/types', UnitController.addType);
router.delete('/types/:name', UnitController.removeType);
router.get('/:id', requirePermission('canViewProperties'), UnitController.getById);
router.post('/', requirePermission('canAddProperties'), validateBody(createUnitSchema), UnitController.create);
router.put('/:id', requirePermission('canEditProperties'), validateBody(updateUnitSchema), UnitController.update);
router.delete('/:id', requirePermission('canDeleteProperties'), UnitController.delete);

export default router;
