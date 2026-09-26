import { Student } from '../models/Student.js';
import { Payment } from '../models/Payment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateStudentId } from '../services/id.service.js';
import { enrichStudent, enrichStudents } from '../services/fee.service.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ensure dates always go out as YYYY-MM-DD, never as full ISO strings. */
const toDateOnly = (d) => {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

const normalizeStudent = (s) => ({
  ...s,
  id: s._id ?? s.id,
  admissionDate: toDateOnly(s.admissionDate)
});

export const list = asyncHandler(async (req, res) => {
  const { q, cls, status, gender, sortKey, sortDir, page, pageSize } = req.query;

  const filter = {};
  if (cls !== 'all') filter.cls = cls;
  if (gender !== 'all') filter.gender = gender;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { _id: rx }, { mobile: rx }, { guardianName: rx }];
  }

  const [students, payments] = await Promise.all([
    Student.find(filter).lean({ virtuals: false, transform: undefined }),
    Payment.find().lean()
  ]);

  // Mongoose .lean() does not run toJSON transform → remap _id to id manually.
  const studentsClean = students.map((s) => ({ ...s, id: s._id }));
  const paymentsClean = payments.map((p) => ({ ...p, id: p._id }));

  let enriched = enrichStudents(studentsClean, paymentsClean);
  if (status !== 'all') enriched = enriched.filter((s) => s.status === status);

  const dir = sortDir === 'asc' ? 1 : -1;
  enriched.sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    if (typeof av === 'string') return av.localeCompare(bv) * dir;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  const total = enriched.length;
  const start = (page - 1) * pageSize;

  res.json({
    success: true,
    data: enriched.slice(start, start + pageSize),
    pagination: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
  });
});

export const getOne = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).lean();
  if (!student) throw ApiError.notFound('Student not found');

  const payments = await Payment.find({ studentId: student._id })
    .sort({ paymentDate: -1 })
    .lean();

  const studentClean = normalizeStudent(student);
  const paymentsClean = payments.map((p) => ({
    ...p,
    id: p._id,
    paymentDate: toDateOnly(p.paymentDate)
  }));

  res.json({
    success: true,
    data: { ...enrichStudent(studentClean, paymentsClean), payments: paymentsClean }
  });
});

export const create = asyncHandler(async (req, res) => {
  const data = req.body;
  const id = await generateStudentId();

  const doc = await Student.create({
    _id: id,
    name: data.name,
    mobile: data.mobile,
    gender: data.gender,
    cls: data.cls,
    monthlyFee: data.monthlyFee,
    startMonth: data.startMonth,
    address: data.address,
    guardianName: data.guardianName || null,
    guardianMobile: data.guardianMobile || null,
    admissionDate: new Date(data.admissionDate),
    notes: data.notes || null
  });

  const out = normalizeStudent(doc.toObject());
  res.status(201).json({ success: true, data: out });
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await Student.findById(id);
  if (!existing) throw ApiError.notFound('Student not found');

  const data = { ...req.body };
  if (data.admissionDate) data.admissionDate = new Date(data.admissionDate);
  if (data.guardianName === '') data.guardianName = null;
  if (data.guardianMobile === '') data.guardianMobile = null;
  if (data.notes === '') data.notes = null;

  Object.assign(existing, data);
  await existing.save();

  const out = normalizeStudent(existing.toObject());
  res.json({ success: true, data: out });
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await Student.findById(id);
  if (!existing) throw ApiError.notFound('Student not found');

  // Manual cascade (Mongoose has no built-in cascade delete)
  await Payment.deleteMany({ studentId: id });
  await Student.deleteOne({ _id: id });

  res.json({ success: true, message: 'Student deleted successfully' });
});