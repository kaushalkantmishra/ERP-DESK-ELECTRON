import { Router } from 'express';
import {
    getItems, addItem,
    getVendors, addVendor, updateVendor,
    getWarehouses, addWarehouse,
    getCategories, addCategory,
    getUoms, addUom
} from '../controllers/masterController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all master data routes
router.use(authMiddleware);

router.get('/items', getItems);
router.post('/items', roleMiddleware(['Admin', 'Store', 'Procurement']), addItem);

router.get('/vendors', getVendors);
router.post('/vendors', roleMiddleware(['Admin', 'Procurement']), addVendor);
router.patch('/vendors/:id', roleMiddleware(['Admin', 'Procurement']), updateVendor);

router.get('/warehouses', getWarehouses);
router.post('/warehouses', roleMiddleware(['Admin', 'Store']), addWarehouse);

router.get('/categories', getCategories);
router.post('/categories', roleMiddleware(['Admin', 'Store']), addCategory);

router.get('/uoms', getUoms);
router.post('/uoms', roleMiddleware(['Admin', 'Store']), addUom);

export default router;
