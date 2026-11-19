import { Router } from 'express';
import { OperationController } from '../controllers/operation.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  createVendorSchema,
  updateVendorSchema,
  createParkingStallSchema,
  assignParkingStallSchema,
  createVisitorPassSchema,
  createStaffSchema,
  toggleShiftSchema,
  createBroadcastSchema,
} from '../validators/operation.validator.js';

const router = Router();

router.use(authenticateToken);

// Vendors
router.get('/vendors', OperationController.listVendors);
router.post('/vendors', validateBody(createVendorSchema), OperationController.createVendor);
router.put('/vendors/:id', validateBody(updateVendorSchema), OperationController.updateVendor);
router.delete('/vendors/:id', OperationController.deleteVendor);
router.post('/vendors/:id/pay', OperationController.disburseVendor);

// Service Categories
router.get('/service-categories', OperationController.listServiceCategories);
router.post('/service-categories', OperationController.createServiceCategory);
router.delete('/service-categories/:id', OperationController.deleteServiceCategory);

// Parking
router.get('/parking', OperationController.listParking);
router.post('/parking', validateBody(createParkingStallSchema), OperationController.createParking);
router.patch('/parking/:id/assign', validateBody(assignParkingStallSchema), OperationController.assignParking);
router.patch('/parking/:id/vacate', OperationController.vacateParking);
router.delete('/parking/:id', OperationController.deleteParking);

// Visitors
router.get('/visitors', OperationController.listVisitors);
router.post('/visitors', validateBody(createVisitorPassSchema), OperationController.issueVisitorPass);
router.patch('/visitors/:id/checkout', OperationController.checkoutVisitor);

// Staff
router.get('/staff', OperationController.listStaff);
router.post('/staff', validateBody(createStaffSchema), OperationController.createStaff);
router.patch('/staff/:id/shift', validateBody(toggleShiftSchema), OperationController.toggleStaffShift);
router.delete('/staff/:id', OperationController.deleteStaff);

// Communications
router.get('/communications', OperationController.listBroadcasts);
router.post('/communications', validateBody(createBroadcastSchema), OperationController.publishBroadcast);
router.delete('/communications/:id', OperationController.deleteBroadcast);

export default router;
