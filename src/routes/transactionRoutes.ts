import { Router } from 'express';
import auth from '../middleware/auth';
import * as transactionController from '../controllers/transactionController';

const router = Router();

router.post('/', auth, transactionController.createTransaction);
router.get('/', auth, transactionController.getTransactions);
router.get('/:id', auth, transactionController.getTransactionById);
router.put('/:id', auth, transactionController.updateTransaction);
router.delete('/:id', auth, transactionController.deleteTransaction);
router.get('/category/:category', auth, transactionController.getTransactionsByCategory);
router.get('/date-range', auth, transactionController.getTransactionsByDateRange);
router.get('/stats', auth, transactionController.getTransactionStats);

export default router;