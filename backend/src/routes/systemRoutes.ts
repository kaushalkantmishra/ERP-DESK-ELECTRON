import { Router } from 'express';
import { getActivityLogs, createActivityLog } from '../controllers/systemController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/logs', getActivityLogs);
router.post('/logs', createActivityLog);

export default router;
