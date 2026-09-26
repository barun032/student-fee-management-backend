import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const signAccess = (admin) =>
  jwt.sign({ sub: String(admin._id), role: admin.role }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl
  });

const signRefresh = (admin) =>
  jwt.sign({ sub: String(admin._id), type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl
  });

const publicAdmin = (a) => ({
  id: String(a._id),
  name: a.name,
  email: a.email,
  phone: a.phone,
  role: a.role
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const exists = await Admin.findOne({ email: email.toLowerCase() });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const count = await Admin.countDocuments();
  if (count > 0) throw ApiError.forbidden('Registration is closed. Contact your administrator.');

  const hash = await bcrypt.hash(password, 10);
  const admin = await Admin.create({
    name, email: email.toLowerCase(), password: hash, phone: phone || null, role: 'ADMIN'
  });

  res.status(201).json({
    success: true,
    data: {
      admin: publicAdmin(admin),
      accessToken: signAccess(admin),
      refreshToken: signRefresh(admin)
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin) throw ApiError.unauthorized('Invalid email or password');

  const ok = await bcrypt.compare(password, admin.password);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  res.json({
    success: true,
    data: {
      admin: publicAdmin(admin),
      accessToken: signAccess(admin),
      refreshToken: signRefresh(admin)
    }
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('refreshToken is required');

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const admin = await Admin.findById(payload.sub);
  if (!admin) throw ApiError.unauthorized('Account no longer exists');

  res.json({
    success: true,
    data: { accessToken: signAccess(admin), refreshToken: signRefresh(admin) }
  });
});

export const me = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin.id);
  res.json({ success: true, data: publicAdmin(admin) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findByIdAndUpdate(req.admin.id, req.body, { new: true });
  res.json({ success: true, data: publicAdmin(admin) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const admin = await Admin.findById(req.admin.id);
  if (!admin) throw ApiError.unauthorized('Account no longer exists');

  const ok = await bcrypt.compare(currentPassword, admin.password);
  if (!ok) throw ApiError.badRequest('Current password is incorrect');

  const sameAsOld = await bcrypt.compare(newPassword, admin.password);
  if (sameAsOld) throw ApiError.badRequest('New password must be different from your current password');

  admin.password = await bcrypt.hash(newPassword, 10);
  await admin.save();

  res.json({ success: true, message: 'Password changed successfully' });
});