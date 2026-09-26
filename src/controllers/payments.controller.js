import { Payment } from '../models/Payment.js';
import { Student } from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generatePaymentId } from '../services/id.service.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toDate = (s) => new Date(`${s}T00:00:00.000Z`);
const clean = (p, student) => ({
  id: p._id,
  studentId: p.studentId,
  studentName: student?.name || '—',
  cls: student?.cls || '—',
  amount: p.amount,
  paymentDate: p.paymentDate.toISOString().slice(0, 10),
  forMonth: p.forMonth || '',
  method: p.method,
  notes: p.notes || '',
  createdAt: p.createdAt
});

export const list = asyncHandler(async (req, res) => {
  const { q, cls, method, from, to, sortKey, sortDir, page, pageSize } = req.query;

  const filter = {};
  if (method !== 'all') filter.method = method;
  if (from || to) {
    filter.paymentDate = {};
    if (from) filter.paymentDate.$gte = toDate(from);
    if (to) filter.paymentDate.$lte = toDate(to);
  }

  let studentIds = null;
  if (cls !== 'all') {
    const students = await Student.find({ cls }).select('_id').lean();
    studentIds = students.map((s) => s._id);
    filter.studentId = { $in: studentIds };
  }

  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const studentsMatching = await Student.find({
      $or: [{ name: rx }, { _id: rx }]
    }).select('_id').lean();
    const ids = studentsMatching.map((s) => s._id);
    filter.$or = [
      { _id: rx },
      { notes: rx },
      { studentId: { $in: ids } }
    ];
  }

  const [rows, total] = await Promise.all([
    Payment.find(filter)
      .sort({ [sortKey]: sortDir })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Payment.countDocuments(filter)
  ]);

  const studentIdsInPage = [...new Set(rows.map((p) => p.studentId))];
  const students = await Student.find({ _id: { $in: studentIdsInPage } })
    .select('_id name cls')
    .lean();
  const studentMap = Object.fromEntries(students.map((s) => [s._id, s]));

  res.json({
    success: true,
    data: rows.map((p) => clean(p, studentMap[p.studentId])),
    pagination: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const p = await Payment.findById(req.params.id).lean();
  if (!p) throw ApiError.notFound('Payment not found');
  const student = await Student.findById(p.studentId).select('_id name cls').lean();
  res.json({ success: true, data: clean(p, student) });
});

export const create = asyncHandler(async (req, res) => {
  const data = req.body;
  const student = await Student.findById(data.studentId).lean();
  if (!student) throw ApiError.badRequest('Selected student does not exist');

  const id = await generatePaymentId();
  const created = await Payment.create({
    _id: id,
    studentId: data.studentId,
    amount: data.amount,
    paymentDate: toDate(data.paymentDate),
    forMonth: data.forMonth || null,
    method: data.method,
    notes: data.notes || null
  });

  res.status(201).json({ success: true, data: clean(created.toObject(), student) });
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await Payment.findById(id);
  if (!existing) throw ApiError.notFound('Payment not found');

  const data = { ...req.body };
  if (data.paymentDate) data.paymentDate = toDate(data.paymentDate);
  if (data.forMonth === '') data.forMonth = null;
  if (data.notes === '') data.notes = null;

  Object.assign(existing, data);
  await existing.save();

  const student = await Student.findById(existing.studentId).select('_id name cls').lean();
  res.json({ success: true, data: clean(existing.toObject(), student) });
});

export const remove = asyncHandler(async (req, res) => {
  const existing = await Payment.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Payment not found');
  await Payment.deleteOne({ _id: existing._id });
  res.json({ success: true, message: 'Payment deleted successfully' });
});