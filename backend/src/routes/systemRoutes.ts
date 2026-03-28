import { Router } from 'express';
import { getActivityLogs, createActivityLog, getApprovalMatrix, updateApprovalMatrix } from '../controllers/systemController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/logs', getActivityLogs);
router.post('/logs', createActivityLog);
router.get('/approval-matrix', getApprovalMatrix);
router.put('/approval-matrix', roleMiddleware(['Admin']), updateApprovalMatrix);

export default router;
