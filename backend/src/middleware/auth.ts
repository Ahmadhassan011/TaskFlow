import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    // Validate the JWT's tenant context: the user must still be an ACTIVE
    // member of the claimed tenant. The effective role is taken from the
    // membership (authoritative), so stale role claims are corrected.
    const membership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: payload.userId,
          tenantId: payload.tenantId,
        },
      },
      select: { tenantId: true, role: true, status: true },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Not a member of the selected workspace' });
      return;
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: membership.role,
      tenantId: membership.tenantId,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};
