import { Router } from 'express';
import {
    getPRs, getPR, createPR, updatePRStatus,
    getRFQs, createRFQ,
    getQuotes, submitQuote, updateQuoteStatus,
    getPOs, createPO, updatePOStatus
} from '../controllers/procurementController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/prs', getPRs);
router.get('/prs/:id', getPR);
router.post('/prs', roleMiddleware(['Admin', 'Dept', 'Procurement']), createPR);
router.patch('/prs/:id/status', roleMiddleware(['Admin', 'Procurement']), updatePRStatus);

router.get('/rfqs', getRFQs);
router.post('/rfqs', roleMiddleware(['Admin', 'Procurement']), createRFQ);

router.get('/quotes', getQuotes);
router.post('/quotes', roleMiddleware(['Admin', 'Procurement']), submitQuote);
router.patch('/quotes/:id/status', roleMiddleware(['Admin', 'Procurement']), updateQuoteStatus);

router.get('/pos', getPOs);
router.post('/pos', roleMiddleware(['Admin', 'Procurement']), createPO);
router.patch('/pos/:id/status', roleMiddleware(['Admin', 'Procurement']), updatePOStatus);

export default router;
