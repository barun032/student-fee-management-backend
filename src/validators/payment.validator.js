import { z } from 'zod';

const yyyymm = z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

export const createPaymentSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  amount: z.number().int().positive().max(10_000_000),
  paymentDate: isoDate,
  method: z.enum(['UPI', 'Cash', 'Bank Transfer', 'Other']),
  forMonth: yyyymm.optional().or(z.literal('')),
  notes: z.string().max(500).trim().optional().or(z.literal(''))
});

export const updatePaymentSchema = createPaymentSchema.partial().omit({ studentId: true });

export const listPaymentsQuerySchema = z.object({
  q: z.string().optional().default(''),
  cls: z.enum(['all', 'Class 11', 'Class 12']).optional().default('all'),
  method: z.enum(['all', 'UPI', 'Cash', 'Bank Transfer', 'Other']).optional().default('all'),
  from: z.string().optional().default(''),
  to: z.string().optional().default(''),
  sortKey: z.enum(['id', 'amount', 'paymentDate', 'forMonth', 'method']).optional().default('paymentDate'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(20)
});