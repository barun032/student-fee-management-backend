import { Router } from 'express';
import * as ctrl from '../controllers/settings.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

const router = Router();
router.use(requireAuth);
router.get('/', ctrl.get);
router.put('/', validate(updateSettingsSchema), ctrl.update);

export default router;