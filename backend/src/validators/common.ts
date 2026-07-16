import { z } from 'zod';

// Accepts either a full ISO datetime (e.g. "2024-01-01T00:00:00.000Z") or a
// date-only string (e.g. "2024-01-01" from <input type="date">). The service
// layer parses these with `new Date(...)`, which handles both. This matches the
// format the frontend naturally sends and keeps the API forgiving.
export const dateString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid date format',
  });
