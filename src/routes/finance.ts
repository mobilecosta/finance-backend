import { Router } from 'express';
import { FinanceController } from '../controllers/FinanceController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
const financeController = new FinanceController();

// Todas as rotas de finanças requerem autenticação
router.use(authMiddleware);

router.get('/dashboard/metrics', financeController.getDashboard);
router.get('/transactions', financeController.getTransactions);
router.post('/transactions', financeController.createTransaction);
router.put('/transactions/:id', financeController.updateTransaction);
router.delete('/transactions/:id', financeController.deleteTransaction);

export default router;
