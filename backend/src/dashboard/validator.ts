import { z } from 'zod';

export const trendSchema = z.object({
  query: z.object({
    days: z
      .string()
      .optional()
      .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 1 && Number(val) <= 365), {
        message: 'Days must be between 1 and 365',
      }),
  }),
});
