import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { hashPassword, comparePassword } from '../utils/encryption.js';
import { log } from '../utils/logger.js';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  tenantName: z.string().min(2),
  tenantSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ============================================
// JWT HELPERS
// ============================================
interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/auth/register
 * Register new tenant with admin user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.adminUser.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Check if tenant slug is taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: data.tenantSlug },
    });

    if (existingTenant) {
      return res.status(400).json({
        success: false,
        error: 'Tenant slug already taken',
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create tenant and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.tenantName,
          slug: data.tenantSlug,
          status: 'TRIAL',
          plan: 'free',
        },
      });

      // Create admin user
      const adminUser = await tx.adminUser.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: 'TENANT_ADMIN',
          tenantId: tenant.id,
        },
      });

      return { tenant, adminUser };
    });

    log.info('New tenant registered', {
      tenantId: result.tenant.id,
      userId: result.adminUser.id,
      email: data.email,
    });

    // Generate tokens
    const payload: JWTPayload = {
      userId: result.adminUser.id,
      tenantId: result.tenant.id,
      email: result.adminUser.email,
      role: result.adminUser.role,
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: result.adminUser.id,
          email: result.adminUser.email,
          name: result.adminUser.name,
          role: result.adminUser.role,
        },
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          plan: result.tenant.plan,
          status: result.tenant.status,
        },
        token,
        refreshToken,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    log.error('Registration error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.adminUser.findUnique({
      where: { email: data.email },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    // Check tenant status
    if (user.tenant.status === 'SUSPENDED' || user.tenant.status === 'CANCELLED') {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.tenant.status.toLowerCase()}`,
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(data.password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    log.info('User logged in', {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
    });

    // Generate tokens
    const payload: JWTPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan,
          status: user.tenant.status,
          themeColor: user.tenant.themeColor,
          logoUrl: user.tenant.logoUrl,
        },
        token,
        refreshToken,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    log.error('Login error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JWTPayload;

    // Verify user still exists and is active
    const user = await prisma.adminUser.findUnique({
      where: { id: decoded.userId },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    // Generate new access token
    const payload: JWTPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(payload);

    res.json({
      success: true,
      data: { token },
    });
  } catch (error: any) {
    log.error('Token refresh error', { error: error.message });
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires auth middleware)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    // Get user data
    const user = await prisma.adminUser.findUnique({
      where: { id: decoded.userId },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan,
          status: user.tenant.status,
          themeColor: user.tenant.themeColor,
          logoUrl: user.tenant.logoUrl,
        },
      },
    });
  } catch (error: any) {
    log.error('Get current user error', { error: error.message });
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }
});

export default router;
