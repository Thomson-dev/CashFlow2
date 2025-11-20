import express from 'express';
import { getCashflowStatus, getUserFinancialSummary, getInsightsPanel } from '../controllers/analyticsController';
import  auth  from '../middleware/auth';

const router = express.Router();

router.get('/cashflow-status', auth, getCashflowStatus);
router.get('/financial-summary', auth, getUserFinancialSummary);
router.get('/insights', auth, getInsightsPanel);

export default router;