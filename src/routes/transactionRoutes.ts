import { Router } from 'express';
import auth from '../middleware/auth';
import * as transactionController from '../controllers/transactionController';

const router = Router();

router.post('/', auth, transactionController.createTransaction);
// router.get('/', auth, transactionController.getTransactions);
// router.get('/:id', auth, transactionController.getTransaction);
// router.put('/:id', auth, transactionController.updateTransaction);
// router.delete('/:id', auth, transactionController.deleteTransaction);

export default router;