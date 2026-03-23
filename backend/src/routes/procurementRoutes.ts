import { Router } from 'express';
import multer from 'multer';
import {
    getPRs, getPR, createPR, updatePR, updatePRStatus,
    getRFQs, getRFQ, createRFQ,
    getQuotes, submitQuote, importQuote, updateQuoteStatus,
    getPOs, getPO, createPO, updatePOStatus
} from '../controllers/procurementController.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get('/prs', getPRs);
router.get('/prs/:id', getPR);
router.post('/prs', roleMiddleware(['Admin', 'Dept', 'Procurement']), createPR);
router.patch('/prs/:id', roleMiddleware(['Admin', 'Dept', 'Procurement']), updatePR);
router.patch('/prs/:id/status', updatePRStatus);

router.get('/rfqs', getRFQs);
router.get('/rfqs/:id', getRFQ);
router.post('/rfqs', roleMiddleware(['Admin', 'Procurement']), createRFQ);

router.get('/quotes', getQuotes);
router.post('/quotes', roleMiddleware(['Admin', 'Procurement']), submitQuote);
router.post('/quotes/import', roleMiddleware(['Admin', 'Procurement']), upload.single('file'), importQuote);
router.patch('/quotes/:id/status', roleMiddleware(['Admin', 'Procurement']), updateQuoteStatus);

router.get('/pos', getPOs);
router.get('/pos/:id', getPO);
router.post('/pos', roleMiddleware(['Admin', 'Procurement']), createPO);
router.patch('/pos/:id/status', roleMiddleware(['Admin', 'Procurement']), updatePOStatus);

export default router;
