import { Router } from 'express';
import { MigrationController } from '../controllers/MigrationController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
const migrationController = new MigrationController();

// Prévia de migração exige autenticação (dados financeiros)
router.use(authMiddleware);

router.get('/sheet-preview', migrationController.previewSheet);

export default router;
