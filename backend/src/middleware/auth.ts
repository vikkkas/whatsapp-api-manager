import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { log } from "../utils/logger.js";
import { env } from "../config/env.js";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId: string;
        email: string;
        role: string;
      };
      tenant?: any;
    }
  }
}

/**
 * Verify JWT token and attach user to request
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);

    // Verify token using env config
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      tenantId: string;
      email: string;
      role: string;
    };

    // Check if session exists and is valid
    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session) {
      return res.status(401).json({ error: "Session invalid or expired" });
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      return res.status(401).json({ error: "Session expired" });
    }

    // Update last active time (async, don't await)
    prisma.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    }).catch(err => log.error('Failed to update session activity', { error: err.message }));

    let user: any = null;
    let tenant: any = null;

    if (decoded.role === 'AGENT') {
      const agent = await prisma.agent.findUnique({
        where: { id: decoded.userId },
        include: { tenant: true },
      });
      
      if (agent) {
        user = agent;
        tenant = agent.tenant;
        // Agents don't have isActive field, assume active if they exist and aren't deleted
        // You might want to add an isActive field to Agent later
      }
    } else {
      const adminUser = await prisma.adminUser.findUnique({
        where: { id: decoded.userId },
        include: { tenant: true },
      });

      if (adminUser) {
        user = adminUser;
        tenant = adminUser.tenant;
      }
    }

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check tenant status
    if (tenant.status === "SUSPENDED") {
      return res.status(403).json({ error: "Account suspended" });
    }

    if (tenant.status === "CANCELLED") {
      return res.status(403).json({ error: "Account cancelled" });
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: decoded.role, // Use role from token or user.role
    };

    req.tenant = tenant;

    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }

    log.error("Authentication error", { error: error.message });
    return res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * Require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.user.role !== "ADMIN" && req.user.role !== "OWNER") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

/**
 * Require owner role
 */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (req.user.role !== "OWNER") {
    return res.status(403).json({ error: "Owner access required" });
  }

  next();
}

/**
 * Optional authentication - attach user if token provided but don't fail
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      tenantId: string;
      email: string;
      role: string;
    };

    const user = await prisma.adminUser.findUnique({
      where: { id: decoded.userId },
      include: { tenant: true },
    });

    if (user && user.tenant.status === "ACTIVE") {
      req.user = {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
      };
      req.tenant = user.tenant;
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}
