import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw ApiError.unauthorized('Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const admin = await Admin.findById(payload.sub).select('name email role phone');
  if (!admin) throw ApiError.unauthorized('Account no longer exists');

  req.admin = {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role
  };

  next();
});