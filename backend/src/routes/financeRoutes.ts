import { Router } from 'express';
import {
    getInvoices,
    getInvoiceById,
    createInvoice,
    updateInvoiceStatus,
    getPayments,
    getPaymentById,
    createPayment,
} from '../controllers/financeController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/invoices', getInvoices);
router.get('/invoice/:id', getInvoiceById);
router.post('/invoice', roleMiddleware(['Admin', 'Finance']), createInvoice);
router.patch('/invoice/:id/status', roleMiddleware(['Admin', 'Finance']), updateInvoiceStatus);

router.get('/payments', getPayments);
router.get('/payment/:id', getPaymentById);
router.post('/payment', roleMiddleware(['Admin', 'Finance']), createPayment);

export default router;
