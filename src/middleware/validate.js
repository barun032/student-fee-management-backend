import { ApiError } from '../utils/ApiError.js';

/**
 * Usage: router.post('/', validate(schema), controller)
 * `schema` is a Zod object with .parse()
 */
export const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err?.issues) {
      const details = err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    next(err);
  }
};