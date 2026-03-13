import { Router } from 'express';
import {
    getPRs, getPR, createPR, updatePRStatus,
    getRFQs, createRFQ,
    getQuotes, submitQuote, updateQuoteStatus,
    getPOs, createPO, updatePOStatus
} from '../controllers/procurementController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/prs', getPRs);
router.get('/prs/:id', getPR);
router.post('/prs', createPR);
router.patch('/prs/:id/status', updatePRStatus);

router.get('/rfqs', getRFQs);
router.post('/rfqs', createRFQ);

router.get('/quotes', getQuotes);
router.post('/quotes', submitQuote);
router.patch('/quotes/:id/status', updateQuoteStatus);

router.get('/pos', getPOs);
router.post('/pos', createPO);
router.patch('/pos/:id/status', updatePOStatus);

export default router;
