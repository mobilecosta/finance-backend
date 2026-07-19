import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
const authController = new AuthController();

router.post('/signup', authController.signup);
router.post('/signin', authController.signin);
router.get('/callback', authController.callback);
router.post('/signout', authMiddleware, authController.signout);
router.get('/user', authMiddleware, authController.getUser);

export default router;
