import { Router } from 'express';
import auth from '../middleware/auth';
import * as transactionController from '../controllers/transactionController';

const router = Router();

router.post('/transactions', auth, transactionController.createTransaction);
router.get('/transactions', auth, transactionController.getTransactions);
router.get('/transactions/:id', auth, transactionController.getTransactionById);
router.put('/transactions/:id', auth, transactionController.updateTransaction);
router.delete('/transactions/:id', auth, transactionController.deleteTransaction);
router.get('/transactions/category/:category', auth, transactionController.getTransactionsByCategory);
router.get('/transactions/date-range', auth, transactionController.getTransactionsByDateRange);
router.get('/stats', auth, transactionController.getTransactionStats);

export default router;