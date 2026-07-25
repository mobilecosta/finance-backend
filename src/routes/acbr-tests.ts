import { Router } from 'express';
import { AcbrTestController } from '../controllers/AcbrTestController.js';

const router = Router();
const ctrl = new AcbrTestController();

router.post('/run', ctrl.runTests.bind(ctrl));
router.get('/report', ctrl.getReportHtml.bind(ctrl));

export default router;