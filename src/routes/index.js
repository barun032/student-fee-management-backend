import { Router } from 'express';
import authRoutes from './auth.routes.js';
import studentsRoutes from './students.routes.js';
import paymentsRoutes from './payments.routes.js';
import settingsRoutes from './settings.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import exportRoutes from './export.routes.js';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({ success: true, status: 'ok', ts: new Date().toISOString() })
);

router.use('/auth', authRoutes);
router.use('/students', studentsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/settings', settingsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/export', exportRoutes);

export default router;