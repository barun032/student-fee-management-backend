import { Router } from 'express';
import * as ctrl from '../controllers/export.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/students.csv', ctrl.studentsCsv);
router.get('/payments.csv', ctrl.paymentsCsv);
router.get('/backup.json', ctrl.backup);
router.post('/restore', ctrl.restore);

export default router;