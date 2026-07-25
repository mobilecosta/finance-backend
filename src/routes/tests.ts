import { Router } from 'express';
import { TestController } from '../controllers/TestController.js';

const router = Router();
const testController = new TestController();

// Executar todos os testes
router.post('/run-all', testController.runAllTests);

// Listagem paginada de testes
router.get('/', testController.getTests);

// Detalhes de um teste (incluindo HTML no JSON)
router.get('/:id', testController.getTest);

// Visualização direta do HTML do relatório
router.get('/:id/html', testController.getTestHtml);

export default router;
