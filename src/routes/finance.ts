import { Router } from 'express';
import { FinanceController } from '../controllers/FinanceController.js';

const router = Router();
const financeController = new FinanceController();

router.get('/dashboard', financeController.getDashboard);
router.get('/transactions', financeController.getTransactions);
router.post('/transactions', financeController.createTransaction);

export default router;
