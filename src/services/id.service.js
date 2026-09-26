import { Student } from '../models/Student.js';
import { Payment } from '../models/Payment.js';

const pad = (n) => String(n).padStart(3, '0');

/**
 * Finds the highest existing numeric suffix in use and returns the next one.
 * Uses a projection-only query so it's cheap.
 */
const nextSequence = async (Model, prefix) => {
  const last = await Model.findOne({ _id: new RegExp(`^${prefix}`) })
    .sort({ _id: -1 })
    .select('_id')
    .lean();

  if (!last) return 1;
  const n = parseInt(String(last._id).slice(prefix.length), 10);
  return Number.isNaN(n) ? 1 : n + 1;
};

export const generateStudentId = () => nextSequence(Student, 'STU').then((n) => `STU${pad(n)}`);
export const generatePaymentId = () => nextSequence(Payment, 'PAY').then((n) => `PAY${pad(n)}`);