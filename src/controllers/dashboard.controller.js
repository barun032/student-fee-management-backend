import { Student } from '../models/Student.js';
import { Payment } from '../models/Payment.js';
import { Settings } from '../models/Settings.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { enrichStudents, computeStats } from '../services/fee.service.js';

const toDateOnly = (d) => {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

const normalize = (arr) =>
  arr.map((d) => ({
    ...d,
    id: d._id,
    admissionDate: d.admissionDate ? toDateOnly(d.admissionDate) : undefined,
    paymentDate: d.paymentDate ? toDateOnly(d.paymentDate) : undefined
  }));

const loadAll = async () => {
  const [students, payments, settings] = await Promise.all([
    Student.find().lean(),
    Payment.find().sort({ paymentDate: -1 }).lean(),
    Settings.findById('singleton').lean()
  ]);
  return {
    students: normalize(students),
    payments: normalize(payments),
    settings
  };
};

export const stats = asyncHandler(async (_req, res) => {
  const { students, payments, settings } = await loadAll();
  const enriched = enrichStudents(students, payments);
  res.json({ success: true, data: { stats: computeStats(enriched), settings } });
});

export const recentPayments = asyncHandler(async (req, res) => {
  const limit = Math.min(20, Number(req.query.limit) || 6);
  const rows = await Payment.find().sort({ paymentDate: -1, createdAt: -1 }).limit(limit).lean();
  const ids = [...new Set(rows.map((r) => r.studentId))];
  const students = await Student.find({ _id: { $in: ids } }).select('_id name cls').lean();
  const map = Object.fromEntries(students.map((s) => [s._id, s]));

  res.json({
    success: true,
    data: rows.map((p) => ({
      id: p._id,
      studentId: p.studentId,
      studentName: map[p.studentId]?.name || '—',
      cls: map[p.studentId]?.cls || '—',
      amount: p.amount,
      paymentDate: p.paymentDate.toISOString().slice(0, 10),
      forMonth: p.forMonth || '',
      method: p.method,
      notes: p.notes || ''
    }))
  });
});

export const recentStudents = asyncHandler(async (req, res) => {
  const limit = Math.min(20, Number(req.query.limit) || 5);
  const students = await Student.find().sort({ createdAt: -1 }).limit(limit).lean();
  const payments = await Payment.find().lean();
  res.json({
    success: true,
    data: enrichStudents(normalize(students), normalize(payments))
  });
});

export const topPending = asyncHandler(async (req, res) => {
  const limit = Math.min(20, Number(req.query.limit) || 5);
  const [students, payments] = await Promise.all([Student.find().lean(), Payment.find().lean()]);
  const enriched = enrichStudents(normalize(students), normalize(payments))
    .filter((s) => s.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, limit);
  res.json({ success: true, data: enriched });
});

export const overview = asyncHandler(async (_req, res) => {
  const { students, payments, settings } = await loadAll();
  const enriched = enrichStudents(students, payments);

  res.json({
    success: true,
    data: {
      stats: computeStats(enriched),
      settings,
      recentPayments: payments.slice(0, 6).map((p) => {
        const s = students.find((x) => x.id === p.studentId);
        return { ...p, studentName: s?.name || '—', cls: s?.cls || '—' };
      }),
      recentStudents: enriched.slice(0, 5),
      topPending: [...enriched]
        .filter((s) => s.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining)
        .slice(0, 5)
    }
  });
});