import { z } from 'zod';

// Helper to sanitize Indian mobile numbers:
// Strips '+91', leading '0', spaces, and dashes.
export const sanitizeMobile = (val: string): string => {
  if (!val) return '';
  let cleaned = val.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
};

// Indian 10-digit mobile validator: starts with 6, 7, 8, 9
export const indianMobileRegex = /^[6-9]\d{9}$/;

export const mobileSchema = z
  .string()
  .transform(sanitizeMobile)
  .refine((val) => indianMobileRegex.test(val), {
    message: 'Mobile number must be a valid 10-digit Indian number starting with 6, 7, 8, or 9',
  });

// Business rule validator for report_date:
// Cannot be in the future, cannot be more than 7 days in past
export const validateReportDate = (dateStr: string): boolean => {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Can't be future
  if (target > today) return false;

  // Max 7 days in the past
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  if (target < sevenDaysAgo) return false;

  return true;
};

export const singleLeadSchema = z.object({
  lead_name: z.string().min(2, 'Student name must have at least 2 characters').trim(),
  mobile: mobileSchema,
  lead_type: z.enum(['online', 'offline'], {
    errorMap: () => ({ message: 'Lead type must be online or offline' }),
  }),
  course: z.string().min(2, 'Please select or enter an academic course').trim(),
  status: z.enum([
    'New',
    'Interested',
    'Follow Up',
    'Not Interested',
    'Admission Done',
    'Wrong Number',
  ], {
    errorMap: () => ({ message: 'Please select a valid counselling status' }),
  }),
  follow_up_date: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export const bulkLeadSubmissionSchema = z.object({
  body: z.object({
    report_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Report date must be YYYY-MM-DD')
      .refine(validateReportDate, {
        message: 'Report date cannot be a future date and cannot be more than 7 days in the past',
      }),
    leads: z
      .array(singleLeadSchema)
      .min(1, 'At least 1 lead row is required')
      .max(60, 'Maximum 60 leads permitted per submission'),
  }),
});

export const checkDuplicateSchema = z.object({
  body: z.object({
    mobiles: z.array(z.string()).min(1, 'At least one mobile number is required to check'),
  }),
});

export const assignLeadsSchema = z.object({
  body: z.object({
    lead_ids: z.array(z.string()).min(1, 'Select at least one lead to reassign'),
    target_employee_id: z.string().min(1, 'Target employee ID is required'),
  }),
});

export const updateLeadSchema = z.object({
  body: z.object({
    lead_name: z.string().min(2).optional(),
    mobile: mobileSchema.optional(),
    lead_type: z.enum(['online', 'offline']).optional(),
    course: z.string().min(2).optional(),
    status: z
      .enum([
        'New',
        'Interested',
        'Follow Up',
        'Not Interested',
        'Admission Done',
        'Wrong Number',
      ])
      .optional(),
    follow_up_date: z.string().nullable().optional(),
    remarks: z.string().nullable().optional(),
  }),
});
