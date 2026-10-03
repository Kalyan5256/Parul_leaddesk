import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username or email is required').trim(),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    full_name: z.string().min(2, 'Full name is required').trim(),
    username: z.string().min(3, 'Username must be at least 3 characters').trim(),
    email: z.string().email('Valid email address is required').trim(),
    password: z.string().min(4, 'Password must have at least 4 characters').optional(),
    role: z.enum(['employee', 'team_lead', 'manager', 'admin'], {
      errorMap: () => ({ message: 'Valid role is required' }),
    }),
    team: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    full_name: z.string().min(2).optional(),
    team: z.string().nullable().optional(),
    role: z.enum(['employee', 'team_lead', 'manager', 'admin']).optional(),
    phone: z.string().nullable().optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    is_active: z.boolean(),
  }),
});
