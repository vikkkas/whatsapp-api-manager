import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';

// Permission middleware factory
export const requirePermission = (...permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // TENANT_ADMIN has all permissions
      if (user.role === 'TENANT_ADMIN' || user.role === 'SYSTEM_ADMIN') {
        return next();
      }

      // For agents, check specific permissions
      if (user.role === 'AGENT') {
        const agent = await prisma.agent.findFirst({
          where: {
            adminUserId: user.userId,
            tenantId: user.tenantId,
          },
        });

        if (!agent) {
          return res.status(403).json({
            success: false,
            error: 'Agent profile not found',
          });
        }

        // Check if agent has at least one of the required permissions
        const hasPermission = permissions.some(permission =>
          agent.permissions.includes(permission as any)
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            required: permissions,
          });
        }

        return next();
      }

      // Unknown role
      return res.status(403).json({
        success: false,
        error: 'Invalid user role',
      });

    } catch (error: any) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed',
      });
    }
  };
};

// Helper to generate random password
export const generatePassword = (name: string): string => {
  const firstName = name.split(' ')[0];
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${firstName}${randomDigits}`;
};

// Helper to hash password
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

// Helper to verify password
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Permission presets
export const PERMISSION_PRESETS = {
  JUNIOR_AGENT: [
    'VIEW_CONVERSATIONS',
    'SEND_MESSAGES',
    'VIEW_CONTACTS',
    'VIEW_CANNED_RESPONSES',
  ],
  SENIOR_AGENT: [
    'VIEW_CONVERSATIONS',
    'SEND_MESSAGES',
    'DELETE_MESSAGES',
    'ASSIGN_CONVERSATIONS',
    'CLOSE_CONVERSATIONS',
    'VIEW_CONTACTS',
    'CREATE_CONTACTS',
    'EDIT_CONTACTS',
    'VIEW_CANNED_RESPONSES',
    'CREATE_CANNED_RESPONSES',
    'VIEW_ANALYTICS',
  ],
  TEAM_LEAD: [
    'VIEW_CONVERSATIONS',
    'SEND_MESSAGES',
    'DELETE_MESSAGES',
    'ASSIGN_CONVERSATIONS',
    'CLOSE_CONVERSATIONS',
    'VIEW_CONTACTS',
    'CREATE_CONTACTS',
    'EDIT_CONTACTS',
    'DELETE_CONTACTS',
    'EXPORT_CONTACTS',
    'VIEW_CAMPAIGNS',
    'VIEW_TEMPLATES',
    'VIEW_CANNED_RESPONSES',
    'CREATE_CANNED_RESPONSES',
    'VIEW_ANALYTICS',
    'EXPORT_ANALYTICS',
    'VIEW_AGENTS',
  ],
  MARKETING_MANAGER: [
    'VIEW_CONVERSATIONS',
    'VIEW_CONTACTS',
    'CREATE_CONTACTS',
    'EDIT_CONTACTS',
    'EXPORT_CONTACTS',
    'VIEW_CAMPAIGNS',
    'CREATE_CAMPAIGNS',
    'EDIT_CAMPAIGNS',
    'DELETE_CAMPAIGNS',
    'EXECUTE_CAMPAIGNS',
    'VIEW_TEMPLATES',
    'CREATE_TEMPLATES',
    'EDIT_TEMPLATES',
    'VIEW_ANALYTICS',
    'EXPORT_ANALYTICS',
  ],
};

export default requirePermission;
