import { Router } from 'express';
import {
    getGRNs, createGRN,
    getStockLevels, getTransactions, createStockTransaction,
    getMaterialRequests, createMaterialRequest
} from '../controllers/inventoryController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/grns', getGRNs);
router.post('/grn', createGRN);

router.get('/stock/levels', getStockLevels);
router.get('/stock/transactions', getTransactions);
router.post('/stock/transaction', createStockTransaction);

router.get('/material-requests', getMaterialRequests);
router.post('/material-request', createMaterialRequest);

export default router;
