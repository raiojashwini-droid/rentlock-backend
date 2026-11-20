import { Router } from 'express';
import authRoutes from './auth.routes.js';
import propertyRoutes from './property.routes.js';
import unitRoutes from './unit.routes.js';
import tenantRoutes from './tenant.routes.js';
import leaseRoutes from './lease.routes.js';
import billingRoutes from './billing.routes.js';
import expenseRoutes from './expense.routes.js';
import maintenanceRoutes from './maintenance.routes.js';
import operationRoutes from './operation.routes.js';
import portalRoutes from './portal.routes.js';
import messageRoutes from './message.routes.js';
import settingsRoutes from './settings.routes.js';
import reportRoutes from './report.routes.js';
import searchRoutes from './search.routes.js';
import { UserController } from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Master API Aggregator under /api/v1
router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/units', unitRoutes);
router.use('/tenants', tenantRoutes);
router.use('/leases', leaseRoutes);
router.use('/invoices', billingRoutes);
router.use('/billing', billingRoutes);
router.use('/expenses', expenseRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/operations', operationRoutes);
router.use('/portal', portalRoutes);
router.use('/messages', messageRoutes);
router.use('/settings', settingsRoutes);
router.use('/reports', reportRoutes);
router.use('/search', searchRoutes);

// Owners and Managers Directories
router.get('/owners', authenticateToken, UserController.listOwners);
router.post('/owners', authenticateToken, UserController.createOwner);
router.put('/owners/:id', authenticateToken, UserController.updateOwner);
router.delete('/owners/:id', authenticateToken, UserController.deleteOwner);
router.get('/managers', authenticateToken, UserController.listManagers);
router.post('/managers', authenticateToken, UserController.createManager);
router.put('/managers/:id', authenticateToken, UserController.updateManager);
router.delete('/managers/:id', authenticateToken, UserController.deleteManager);

export default router;
