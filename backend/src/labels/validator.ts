import { z } from 'zod';

export const createLabelSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Label name is required'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  }),
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
});

export const updateLabelSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  }),
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    labelId: z.string().uuid('Invalid label ID'),
  }),
});

export const deleteLabelSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    labelId: z.string().uuid('Invalid label ID'),
  }),
});

export const listLabelsSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID'),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});
