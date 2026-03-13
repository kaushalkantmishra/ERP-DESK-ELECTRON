import { Router } from 'express';
import {
    getItems, addItem,
    getVendors, addVendor,
    getWarehouses, addWarehouse,
    getCategories, addCategory,
    getUoms, addUom
} from '../controllers/masterController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all master data routes
router.use(authMiddleware);

router.get('/items', getItems);
router.post('/items', addItem);

router.get('/vendors', getVendors);
router.post('/vendors', addVendor);

router.get('/warehouses', getWarehouses);
router.post('/warehouses', addWarehouse);

router.get('/categories', getCategories);
router.post('/categories', addCategory);

router.get('/uoms', getUoms);
router.post('/uoms', addUom);

export default router;
