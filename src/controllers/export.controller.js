import { Student } from '../models/Student.js';
import { Payment } from '../models/Payment.js';
import { Settings } from '../models/Settings.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { enrichStudents } from '../services/fee.service.js';

const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const toCsv = (rows, columns) =>
  '\uFEFF' + [columns.map((c) => escape(c.label)).join(','), ...rows.map((r) => columns.map((c) => escape(c.value(r))).join(','))].join('\r\n');

export const studentsCsv = asyncHandler(async (_req, res) => {
  const [students, payments] = await Promise.all([Student.find().lean(), Payment.find().lean()]);
  const enriched = enrichStudents(
    students.map((s) => ({ ...s, id: s._id })),
    payments.map((p) => ({ ...p, id: p._id }))
  );
  const csv = toCsv(enriched, [
    { label: 'Student ID', value: (r) => r.id },
    { label: 'Name', value: (r) => r.name },
    { label: 'Mobile', value: (r) => r.mobile },
    { label: 'Class', value: (r) => r.cls },
    { label: 'Monthly Fee', value: (r) => r.monthlyFee },
    { label: 'Total Due', value: (r) => r.totalDue },
    { label: 'Paid', value: (r) => r.paid },
    { label: 'Remaining', value: (r) => Math.max(0, r.remaining) },
    { label: 'Status', value: (r) => r.status }
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="students-${Date.now()}.csv"`);
  res.send(csv);
});

export const paymentsCsv = asyncHandler(async (_req, res) => {
  const rows = await Payment.find().sort({ paymentDate: -1 }).lean();
  const students = await Student.find().lean();
  const map = Object.fromEntries(students.map((s) => [s._id, s]));

  const csv = toCsv(rows, [
    { label: 'Payment ID', value: (r) => r._id },
    { label: 'Student ID', value: (r) => r.studentId },
    { label: 'Student Name', value: (r) => map[r.studentId]?.name || '' },
    { label: 'Amount', value: (r) => r.amount },
    { label: 'For Month', value: (r) => r.forMonth || '' },
    { label: 'Payment Date', value: (r) => r.paymentDate.toISOString().slice(0, 10) },
    { label: 'Method', value: (r) => r.method }
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="payments-${Date.now()}.csv"`);
  res.send(csv);
});

export const backup = asyncHandler(async (_req, res) => {
  const [students, payments, settings] = await Promise.all([
    Student.find().lean(),
    Payment.find().lean(),
    Settings.findById('singleton').lean()
  ]);
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    students: students.map((s) => ({
      ...s, id: s._id,
      admissionDate: s.admissionDate.toISOString().slice(0, 10)
    })),
    payments: payments.map((p) => ({
      ...p, id: p._id,
      paymentDate: p.paymentDate.toISOString().slice(0, 10)
    })),
    settings
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="edufee-backup-${Date.now()}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

export const restore = asyncHandler(async (req, res) => {
  const { students = [], payments = [], settings } = req.body || {};
  if (!Array.isArray(students) || !Array.isArray(payments)) {
    return res.status(400).json({ success: false, message: 'Invalid backup payload' });
  }

  await Payment.deleteMany({});
  await Student.deleteMany({});

  for (const s of students) {
    await Student.create({
      _id: s.id,
      name: s.name,
      mobile: s.mobile,
      gender: s.gender,
      cls: s.cls,
      monthlyFee: s.monthlyFee,
      startMonth: s.startMonth,
      address: s.address,
      guardianName: s.guardianName || null,
      guardianMobile: s.guardianMobile || null,
      admissionDate: new Date(s.admissionDate),
      notes: s.notes || null
    });
  }

  for (const p of payments) {
    await Payment.create({
      _id: p.id,
      studentId: p.studentId,
      amount: p.amount,
      paymentDate: new Date(p.paymentDate),
      forMonth: p.forMonth || null,
      method: p.method,
      notes: p.notes || null
    });
  }

  if (settings) {
    await Settings.findByIdAndUpdate(
      'singleton',
      { ...settings, id: undefined, _id: undefined },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  res.json({ success: true, message: 'Backup restored successfully' });
});