import { Request, Response, NextFunction } from 'express';
import { OperationService } from '../services/operation.service.js';
import { sendSuccess } from '../utils/response.js';

export class OperationController {
  // Vendors
  static async listVendors(req: Request, res: Response, next: NextFunction) {
    try {
      const vendors = await OperationService.listVendors();
      return sendSuccess(res, vendors);
    } catch (error) {
      return next(error);
    }
  }

  static async createVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const vendor = await OperationService.createVendor(req.body);
      return sendSuccess(res, vendor, 'Vendor added successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async updateVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const rawId = req.params.id;
      const digits = String(rawId).replace(/\D/g, '');
      const id = digits ? parseInt(digits, 10) : parseInt(rawId, 10);
      const vendor = await OperationService.updateVendor(id, req.body);
      return sendSuccess(res, vendor, 'Vendor updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async deleteVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const rawId = req.params.id;
      const digits = String(rawId).replace(/\D/g, '');
      const id = digits ? parseInt(digits, 10) : parseInt(rawId, 10);
      await OperationService.deleteVendor(id);
      return sendSuccess(res, { id: rawId }, 'Vendor removed successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async disburseVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await OperationService.disburseVendor(id, req.body.amount, req.body.memo);
      return sendSuccess(res, result, 'Vendor disbursement authorized');
    } catch (error) {
      return next(error);
    }
  }

  // Service Categories
  static async listServiceCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await OperationService.listServiceCategories();
      return sendSuccess(res, categories);
    } catch (error) {
      return next(error);
    }
  }

  static async createServiceCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await OperationService.createServiceCategory(req.body.name);
      return sendSuccess(res, category, 'Service category created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async deleteServiceCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await OperationService.deleteServiceCategory(req.params.id);
      return sendSuccess(res, result, 'Service category removed successfully');
    } catch (error) {
      return next(error);
    }
  }

  // Parking
  static async listParking(req: Request, res: Response, next: NextFunction) {
    try {
      const stalls = await OperationService.listParkingStalls(req.query);
      return sendSuccess(res, stalls);
    } catch (error) {
      return next(error);
    }
  }

  static async createParking(req: Request, res: Response, next: NextFunction) {
    try {
      const stall = await OperationService.createParkingStall(req.body);
      return sendSuccess(res, stall, 'Parking stall created', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async assignParking(req: Request, res: Response, next: NextFunction) {
    try {
      const rawId = req.params.id;
      const digits = String(rawId).replace(/\D/g, '');
      const id = digits ? parseInt(digits, 10) : parseInt(rawId, 10);
      const { tenantId, vehiclePlate } = req.body;
      const stall = await OperationService.assignParkingStall(id, tenantId, vehiclePlate);
      return sendSuccess(res, stall, 'Parking stall assigned to resident');
    } catch (error) {
      return next(error);
    }
  }

  static async vacateParking(req: Request, res: Response, next: NextFunction) {
    try {
      const rawId = req.params.id;
      const digits = String(rawId).replace(/\D/g, '');
      const id = digits ? parseInt(digits, 10) : parseInt(rawId, 10);
      const stall = await OperationService.vacateParkingStall(id);
      return sendSuccess(res, stall, 'Parking stall marked vacant');
    } catch (error) {
      return next(error);
    }
  }

  static async deleteParking(req: Request, res: Response, next: NextFunction) {
    try {
      const rawId = req.params.id;
      const digits = String(rawId).replace(/\D/g, '');
      const id = digits ? parseInt(digits, 10) : parseInt(rawId, 10);
      await OperationService.deleteParkingStall(id);
      return sendSuccess(res, { id: rawId }, 'Parking stall deleted');
    } catch (error) {
      return next(error);
    }
  }

  // Visitors
  static async listVisitors(req: Request, res: Response, next: NextFunction) {
    try {
      const visitors = await OperationService.listVisitors(req.query);
      return sendSuccess(res, visitors);
    } catch (error) {
      return next(error);
    }
  }

  static async issueVisitorPass(req: Request, res: Response, next: NextFunction) {
    try {
      const pass = await OperationService.issueVisitorPass(req.body);
      return sendSuccess(res, pass, 'Digital visitor pass generated', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async checkoutVisitor(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const pass = await OperationService.checkoutVisitor(id);
      return sendSuccess(res, pass, 'Visitor marked checked out');
    } catch (error) {
      return next(error);
    }
  }

  // Staff
  static async listStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const staff = await OperationService.listStaff(req.query);
      return sendSuccess(res, staff);
    } catch (error) {
      return next(error);
    }
  }

  static async createStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const staff = await OperationService.createStaff(req.body);
      return sendSuccess(res, staff, 'Staff member added', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async toggleStaffShift(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const staff = await OperationService.toggleStaffShift(id, req.body.shiftStatus);
      return sendSuccess(res, staff, `Staff shift toggled to ${req.body.shiftStatus}`);
    } catch (error) {
      return next(error);
    }
  }

  static async deleteStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await OperationService.deleteStaff(id);
      return sendSuccess(res, { id }, 'Staff record removed');
    } catch (error) {
      return next(error);
    }
  }

  // Broadcasts
  static async listBroadcasts(req: Request, res: Response, next: NextFunction) {
    try {
      const broadcasts = await OperationService.listBroadcasts(req.query);
      return sendSuccess(res, broadcasts);
    } catch (error) {
      return next(error);
    }
  }

  static async publishBroadcast(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new Error('Unauthorized');
      const broadcast = await OperationService.publishBroadcast(req.body, req.user);
      return sendSuccess(res, broadcast, 'Building announcement broadcast published', 201);
    } catch (error) {
      return next(error);
    }
  }

  static async deleteBroadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await OperationService.deleteBroadcast(id);
      return sendSuccess(res, { id }, 'Broadcast announcement removed');
    } catch (error) {
      return next(error);
    }
  }
}
