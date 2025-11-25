import express from 'express';
import { getCashflowStatus, getUserFinancialSummary, getInsightsPanel, getDashboardData } from '../controllers/analyticsController';
import  auth  from '../middleware/auth';

const router = express.Router();

router.get('/cashflow-status', auth, getCashflowStatus);
router.get('/financial-summary', auth, getUserFinancialSummary);
router.get('/insights', auth, getInsightsPanel);

router.get('/data', auth, getDashboardData);
export default router;