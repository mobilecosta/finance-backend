import { Router } from 'express';
import { AcbrController } from '../controllers/AcbrController.js';

const router = Router();
const ctrl = new AcbrController();

router.post('/auth', ctrl.auth.bind(ctrl));
router.all('/*', ctrl.proxy.bind(ctrl));

export default router;
