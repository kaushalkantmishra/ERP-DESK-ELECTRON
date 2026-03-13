import { Router } from 'express';
import { getInvoices, createInvoice, updateInvoiceStatus } from '../controllers/financeController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/invoices', getInvoices);
router.post('/invoice', createInvoice);
router.patch('/invoice/:id/status', updateInvoiceStatus);

export default router;
