import { z } from 'zod';

const mobile = z.string().regex(/^\d{10}$/, 'Must be a 10-digit number');
const yyyymm = z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

export const createStudentSchema = z.object({
  name: z.string().min(2).max(80).trim(),
  mobile,
  gender: z.enum(['Male', 'Female', 'Other']),
  cls: z.enum(['Class 11', 'Class 12']),
  monthlyFee: z.number().int().positive().max(10_000_000),
  startMonth: yyyymm,
  address: z.string().min(2).max(300).trim(),
  guardianName: z.string().max(80).trim().optional().or(z.literal('')),
  guardianMobile: mobile.optional().or(z.literal('')),
  admissionDate: isoDate,
  notes: z.string().max(500).trim().optional().or(z.literal(''))
});

export const updateStudentSchema = createStudentSchema.partial();

export const listStudentsQuerySchema = z.object({
  q: z.string().optional().default(''),
  cls: z.enum(['all', 'Class 11', 'Class 12']).optional().default('all'),
  status: z.enum(['all', 'New', 'Paid', 'Partially Paid', 'Pending']).optional().default('all'),
  gender: z.enum(['all', 'Male', 'Female', 'Other']).optional().default('all'),
  sortKey: z.enum(['createdAt', 'name', 'id', 'totalDue', 'paid', 'remaining', 'admissionDate', 'monthsDue']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(20)
});