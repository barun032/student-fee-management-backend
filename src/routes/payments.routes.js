import { Router } from 'express';
import * as ctrl from '../controllers/payments.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPaymentSchema,
  updatePaymentSchema,
  listPaymentsQuerySchema
} from '../validators/payment.validator.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, _res, next) => {
  try { req.query = listPaymentsQuerySchema.parse(req.query); next(); }
  catch (e) { next(e); }
}, ctrl.list);

router.get('/:id', ctrl.getOne);
router.post('/', validate(createPaymentSchema), ctrl.create);
router.put('/:id', validate(updatePaymentSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;