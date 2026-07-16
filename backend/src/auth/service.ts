import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../config/database';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/jwt';
import { createError } from '../middleware/error';
import { env } from '../config/env';
import { ROLES, SALT_ROUNDS, slugify } from '../config/constants';
import { logActivity } from '../activity/service';

const uniqueTenantSlug = async (base: string): Promise<string> => {
  let slug = base;
  let n = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
};

// Resolves the active workspace a user belongs to (used for audit logging on
// account-lifecycle actions that run outside an explicit tenant context).
const resolveTenantId = async (userId: string): Promise<string | null> => {
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId, status: 'ACTIVE' },
  });
  return membership?.tenantId ?? null;
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const register = async (
  email: string,
  name: string,
  password: string
): Promise<AuthTokens> => {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw createError(409, 'Email already registered');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Every registration gets their own workspace (tenant), owned by them.
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: ROLES.OWNER,
      ...(env.NODE_ENV !== 'production' && { isVerified: true }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  // Create the user's personal workspace + OWNER membership.
  const slug = await uniqueTenantSlug(slugify(`${name || email}-workspace`));
  const tenant = await prisma.tenant.create({
    data: {
      name: `${name || email}'s Workspace`,
      slug,
      ownerId: user.id,
    },
  });
  await prisma.tenantMembership.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      role: ROLES.OWNER,
      status: 'ACTIVE',
    },
  });

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerificationToken = await bcrypt.hash(verificationToken, SALT_ROUNDS);

  // Verification token expires in 24 hours
  const verificationExpiry = new Date();
  verificationExpiry.setHours(verificationExpiry.getHours() + 24);

  await prisma.emailVerificationToken.create({
    data: {
      token: hashedVerificationToken,
      userId: user.id,
      expiresAt: verificationExpiry,
    },
  });

  // In production, send email with verificationToken
  // For now, log it for development purposes
  console.log(`Email verification token for ${email}: ${verificationToken}`);

  // Generate tokens (role + tenant come from the membership)
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: ROLES.OWNER,
    tenantId: tenant.id,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token
  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshExpiry,
    },
  });

  // Log activity
  await logActivity({
    tenantId: tenant.id,
    userId: user.id,
    action: 'REGISTERED',
    entityType: 'USER',
    entityId: user.id,
  });

  return {
    accessToken,
    refreshToken,
    tenantId: tenant.id,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: ROLES.OWNER,
    },
  };
};

export const verifyEmail = async (token: string): Promise<void> => {
  // Find all non-expired verification tokens
  const verificationTokens = await prisma.emailVerificationToken.findMany({
    where: {
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  // Check each token to find a match (since we store hashed tokens)
  let matchedToken: (typeof verificationTokens)[0] | null = null;
  for (const vt of verificationTokens) {
    const isMatch = await bcrypt.compare(token, vt.token);
    if (isMatch) {
      matchedToken = vt;
      break;
    }
  }

  if (!matchedToken) {
    throw createError(401, 'Invalid or expired verification token');
  }

  // Update user as verified and delete the token in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: matchedToken.userId },
      data: { isVerified: true },
    }),
    prisma.emailVerificationToken.delete({
      where: { id: matchedToken.id },
    }),
  ]);
};

export const login = async (
  email: string,
  password: string
): Promise<AuthTokens> => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw createError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw createError(401, 'Account is inactive');
  }

  if (!user.isVerified) {
    throw createError(403, 'Please verify your email before logging in');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw createError(401, 'Invalid email or password');
  }

  // Resolve the user's active workspace (OWNER preferred, else any active one).
  let membership = await prisma.tenantMembership.findFirst({
    where: { userId: user.id, status: 'ACTIVE', role: ROLES.OWNER },
  });
  if (!membership) {
    membership = await prisma.tenantMembership.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
    });
  }

  let tenantId = membership?.tenantId;
  let role = membership?.role || user.role;

  // Bootstrap: legacy users with no membership get a personal workspace so they
  // are never locked out at the auth middleware.
  if (!membership) {
    const slug = await uniqueTenantSlug(slugify(`${user.name}-workspace`));
    const tenant = await prisma.tenant.create({
      data: {
        name: `${user.name}'s Workspace`,
        slug,
        ownerId: user.id,
      },
    });
    await prisma.tenantMembership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: ROLES.OWNER,
        status: 'ACTIVE',
      },
    });
    tenantId = tenant.id;
    role = ROLES.OWNER;
  }

  // Generate tokens (role + tenant from the resolved membership)
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role,
    tenantId: tenantId!,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store refresh token
  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshExpiry,
    },
  });

  // Log activity
  await logActivity({
    tenantId: tenantId!,
    userId: user.id,
    action: 'LOGIN',
    entityType: 'USER',
    entityId: user.id,
  });

  return {
    accessToken,
    refreshToken,
    tenantId: tenantId!,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    },
  };
};

// Switch the caller's active workspace by re-issuing tokens for a membership they
// already hold. The target tenant is server-validated (never trusted from the body
// beyond the id) so a user can only switch into workspaces they belong to.
export const switchTenant = async (
  userId: string,
  targetTenantId: string
): Promise<AuthTokens> => {
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId, tenantId: targetTenantId, status: 'ACTIVE' },
  });

  if (!membership) {
    throw createError(403, 'You are not a member of that workspace');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) {
    throw createError(404, 'User not found');
  }

  // Role + tenant come from the chosen membership (the same user may have a
  // different role in a different workspace).
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: membership.role,
    tenantId: membership.tenantId,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshExpiry,
    },
  });

  await logActivity({
    tenantId: membership.tenantId,
    userId: user.id,
    action: 'TENANT_SWITCH',
    entityType: 'TENANT',
    entityId: membership.tenantId,
  });

  return {
    accessToken,
    refreshToken,
    tenantId: membership.tenantId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: membership.role,
    },
  };
};

export const refreshTokens = async (
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  // Verify refresh token
  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw createError(401, 'Invalid refresh token');
  }

  // Check if token exists in database
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!storedToken) {
    throw createError(401, 'Refresh token not found');
  }

  // Check if token is expired
  if (new Date() > storedToken.expiresAt) {
    // Delete expired token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });
    throw createError(401, 'Refresh token expired');
  }

  // Delete old refresh token
  await prisma.refreshToken.delete({
    where: { id: storedToken.id },
  });

  // Re-validate the active membership still exists (tenant may have been left).
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: payload.userId, tenantId: payload.tenantId, status: 'ACTIVE' },
  });
  const tenantId = membership?.tenantId ?? payload.tenantId;
  const role = membership?.role ?? payload.role;

  // Generate new tokens
  const newAccessToken = generateAccessToken({
    userId: payload.userId,
    email: payload.email,
    role,
    tenantId,
  });

  const newRefreshToken = generateRefreshToken({
    userId: payload.userId,
    email: payload.email,
    role,
    tenantId,
  });

  // Store new refresh token
  const refreshExpiry = new Date();
  refreshExpiry.setDate(refreshExpiry.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: payload.userId,
      expiresAt: refreshExpiry,
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const logout = async (refreshToken: string): Promise<void> => {
  // Log activity before deleting token
  try {
    const payload = verifyRefreshToken(refreshToken);
    await logActivity({
      tenantId: payload.tenantId,
      userId: payload.userId,
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: payload.userId,
    });
  } catch {
    // Token may be invalid/expired, but logout should still proceed
  }

  // Delete refresh token from database
  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw createError(404, 'User not found');
  }

  // Resolve the active workspace so the client knows the user's role/tenant.
  let membership = await prisma.tenantMembership.findFirst({
    where: { userId, status: 'ACTIVE', role: ROLES.OWNER },
  });
  if (!membership) {
    membership = await prisma.tenantMembership.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
  }

  return {
    ...user,
    role: membership?.role || user.role,
    tenantId: membership?.tenantId ?? null,
  };
};

export const updateProfile = async (
  userId: string,
  data: { name?: string; email?: string }
) => {
  // Check if email is being changed and already exists
  if (data.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser && existingUser.id !== userId) {
      throw createError(409, 'Email already in use');
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw createError(404, 'User not found');
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw createError(401, 'Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  // Invalidate all refresh tokens for this user
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });

  // Log activity
  const changedTid = await resolveTenantId(userId);
  if (changedTid) {
    await logActivity({
      tenantId: changedTid,
      userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userId,
    });
  }
};

export const forgotPassword = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Return silently to prevent email enumeration
    return;
  }

  // Invalidate any existing reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Generate a secure random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);

  // Token expires in 1 hour
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  await prisma.passwordResetToken.create({
    data: {
      token: hashedToken,
      userId: user.id,
      expiresAt,
    },
  });

  // In production, send email with resetToken
  // For now, log it for development purposes
  console.log(`Password reset token for ${email}: ${resetToken}`);
};

export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<void> => {
  // Find all non-used, non-expired tokens
  const resetTokens = await prisma.passwordResetToken.findMany({
    where: {
      used: false,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  // Check each token to find a match (since we store hashed tokens)
  let matchedToken: (typeof resetTokens)[0] | null = null;
  for (const rt of resetTokens) {
    const isMatch = await bcrypt.compare(token, rt.token);
    if (isMatch) {
      matchedToken = rt;
      break;
    }
  }

  if (!matchedToken) {
    throw createError(401, 'Invalid or expired reset token');
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update password and mark token as used in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: matchedToken.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: matchedToken.id },
      data: { used: true },
    }),
  ]);

  // Invalidate all refresh tokens for this user
  await prisma.refreshToken.deleteMany({
    where: { userId: matchedToken.userId },
  });

  // Log activity
  const resetTid = await resolveTenantId(matchedToken.userId);
  if (resetTid) {
    await logActivity({
      tenantId: resetTid,
      userId: matchedToken.userId,
      action: 'PASSWORD_RESET',
      entityType: 'USER',
      entityId: matchedToken.userId,
    });
  }
};

export const deleteAccount = async (
  userId: string,
  password: string
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw createError(404, 'User not found');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw createError(401, 'Incorrect password');
  }

  // Soft delete - mark as inactive
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  // Invalidate all refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });

  // Log activity
  const deletedTid = await resolveTenantId(userId);
  if (deletedTid) {
    await logActivity({
      tenantId: deletedTid,
      userId,
      action: 'ACCOUNT_DELETED',
      entityType: 'USER',
      entityId: userId,
    });
  }
};
