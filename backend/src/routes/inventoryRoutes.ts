import { Router } from 'express';
import {
    getGRNs, createGRN, reverseGRN,
    getStockLevels, getTransactions, createStockTransaction,
    getMaterialRequests, createMaterialRequest, issueMaterialRequest
} from '../controllers/inventoryController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/grns', getGRNs);
router.post('/grn', roleMiddleware(['Admin', 'Store']), createGRN);
router.post('/grns/:id/reverse', roleMiddleware(['Admin', 'Store']), reverseGRN);

router.get('/stock/levels', getStockLevels);
router.get('/stock/transactions', getTransactions);
router.post('/stock/transaction', roleMiddleware(['Admin', 'Store']), createStockTransaction);

router.get('/material-requests', getMaterialRequests);
router.post('/material-request', roleMiddleware(['Admin', 'Dept', 'Store']), createMaterialRequest);
router.post('/material-requests/:id/issue', roleMiddleware(['Admin', 'Store']), issueMaterialRequest);

export default router;
