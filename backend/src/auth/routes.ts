import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as authService from './service';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, refreshTokenSchema, updateProfileSchema, logoutSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, deleteAccountSchema, switchTenantSchema } from './validator';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, name, password } = req.body;
    const result = await authService.register(email, name, password);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    await authService.verifyEmail(token);
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/switch-tenant  — re-issue tokens for a workspace the caller belongs to
router.post(
  '/switch-tenant',
  authenticate,
  validate(switchTenantSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await authService.switchTenant(req.user!.userId, req.body.tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/logout
router.post('/logout', validate(logoutSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/profile
router.get('/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const profile = await authService.getProfile(req.user!.userId);
    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/profile
router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const profile = await authService.updateProfile(req.user!.userId, req.body);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/auth/password
router.put(
  '/password',
  authenticate,
  validate(changePasswordSchema),
  async (req: AuthRequest, res, next) => {
    try {
      await authService.changePassword(
        req.user!.userId,
        req.body.currentPassword,
        req.body.newPassword
      );
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/auth/account
router.delete(
  '/account',
  authenticate,
  validate(deleteAccountSchema),
  async (req: AuthRequest, res, next) => {
    try {
      await authService.deleteAccount(req.user!.userId, req.body.password);
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
