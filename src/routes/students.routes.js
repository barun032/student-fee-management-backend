import { Router } from 'express';
import * as ctrl from '../controllers/students.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createStudentSchema,
  updateStudentSchema,
  listStudentsQuerySchema
} from '../validators/student.validator.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, _res, next) => {
  try { req.query = listStudentsQuerySchema.parse(req.query); next(); }
  catch (e) { next(e); }
}, ctrl.list);

router.get('/:id', ctrl.getOne);
router.post('/', validate(createStudentSchema), ctrl.create);
router.put('/:id', validate(updateStudentSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;