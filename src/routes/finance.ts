import { Router } from 'express';
import { FinanceController } from '../controllers/FinanceController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
const financeController = new FinanceController();

// Todas as rotas de finanças requerem autenticação
router.use(authMiddleware);

router.get('/dashboard/metrics', financeController.getDashboard);

router.get('/accounts', financeController.getAccounts);
router.get('/accounts/:id', financeController.getAccount);
router.post('/accounts', financeController.createAccount);
router.put('/accounts/:id', financeController.updateAccount);
router.delete('/accounts/:id', financeController.deleteAccount);

router.get('/categories', financeController.getCategories);
router.get('/categories/:id', financeController.getCategory);
router.post('/categories', financeController.createCategory);
router.put('/categories/:id', financeController.updateCategory);
router.delete('/categories/:id', financeController.deleteCategory);

router.get('/transactions', financeController.getTransactions);
router.post('/transactions', financeController.createTransaction);
router.put('/transactions/:id', financeController.updateTransaction);
router.delete('/transactions/:id', financeController.deleteTransaction);

export default router;
