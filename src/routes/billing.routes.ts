import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import {
  createInvoiceSchema,
  payInvoiceSchema,
  voidInvoiceSchema,
  reverseReceiptSchema,
  createAdjustmentSchema,
  deductDepositSchema,
  refundDepositSchema,
} from '../validators/billing.validator.js';

const router = Router();

router.use(authenticateToken);

// Invoices
router.get('/', BillingController.listInvoices);
router.get('/:id', BillingController.getInvoiceById);
router.post('/', validateBody(createInvoiceSchema), BillingController.createInvoice);
router.post('/:id/pay', validateBody(payInvoiceSchema), BillingController.payInvoice);
router.patch('/:id/void', validateBody(voidInvoiceSchema), BillingController.voidInvoice);

// Receipts & Audits
router.get('/receipts/all', BillingController.listReceipts);
router.post('/receipts/:id/reverse', validateBody(reverseReceiptSchema), BillingController.reverseReceipt);

// General Ledger & Adjustments
router.get('/ledger/rows', BillingController.getLedger);
router.post('/adjustments', validateBody(createAdjustmentSchema), BillingController.createAdjustment);

// Security Deposits
router.get('/security-deposits/all', BillingController.listSecurityDeposits);
router.post('/security-deposits/:id/deduct', validateBody(deductDepositSchema), BillingController.deductDeposit);
router.post('/security-deposits/:id/refund', validateBody(refundDepositSchema), BillingController.refundDeposit);

export default router;
