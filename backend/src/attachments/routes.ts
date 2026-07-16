import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import * as attachmentService from './service';
import { authenticate } from '../middleware/auth';

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await attachmentService.ensureUploadsDir();
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const router = Router();

router.get(
  '/tasks/:taskId/attachments',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      const { page, limit } = req.query;
      const result = await attachmentService.listAttachments(
        req.params.taskId,
        req.user!.userId,
        req.user!.tenantId,
        page ? parseInt(page as string) : undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/tasks/:taskId/attachments',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await attachmentService.uploadAttachment(
        req.params.taskId,
        req.user!.userId,
        req.file,
        req.user!.tenantId
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/attachments/:id/download',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      const attachment = await attachmentService.getAttachment(
        req.params.id,
        req.user!.tenantId,
        req.user!.userId
      );
      const filePath = path.join(process.cwd(), 'uploads', attachment.filename);
      res.download(filePath, attachment.originalName);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/attachments/:id',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      const result = await attachmentService.deleteAttachment(
        req.params.id,
        req.user!.userId,
        req.user!.tenantId,
        req.user!.role
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
