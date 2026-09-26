import { z } from 'zod';

export const updateSettingsSchema = z.object({
  instituteName: z.string().min(2).max(120).trim().optional(),
  academicSession: z.string().min(2).max(40).trim().optional(),
  class11MonthlyFee: z.number().int().positive().max(10_000_000).optional(),
  class12MonthlyFee: z.number().int().positive().max(10_000_000).optional()
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).trim().optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\d{10}$/).optional().or(z.literal(''))
});