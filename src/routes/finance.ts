import { Router } from 'express';
import { FinanceController } from '../controllers/FinanceController.js';

const router = Router();
const financeController = new FinanceController();

router.get('/dashboard', financeController.getDashboard);
router.get('/transactions', financeController.getTransactions);
router.post('/transactions', financeController.createTransaction);
router.put('/transactions/:id', financeController.updateTransaction);
router.delete('/transactions/:id', financeController.deleteTransaction);

export default router;
