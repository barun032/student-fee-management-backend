import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/stats', ctrl.stats);
router.get('/recent-payments', ctrl.recentPayments);
router.get('/recent-students', ctrl.recentStudents);
router.get('/top-pending', ctrl.topPending);
router.get('/overview', ctrl.overview);

export default router;