import express from 'express';
import { getCashflowStatus } from '../controllers/analyticsController';
import  auth  from '../middleware/auth';

const router = express.Router();

router.get('/cashflow-status', auth, getCashflowStatus);

export default router;