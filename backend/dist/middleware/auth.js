import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.adminUser.findUnique({
            where: { id: decoded.userId },
            include: { tenant: true },
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        if (user.tenant.status === 'SUSPENDED') {
            return res.status(403).json({ error: 'Account suspended' });
        }
        if (user.tenant.status === 'CANCELLED') {
            return res.status(403).json({ error: 'Account cancelled' });
        }
        req.user = {
            userId: user.id,
            tenantId: user.tenantId,
            email: user.email,
            role: user.role,
        };
        req.tenant = user.tenant;
        next();
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        log.error('Authentication error', { error: error.message });
        return res.status(500).json({ error: 'Authentication failed' });
    }
}
export function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}
export function requireOwner(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role !== 'OWNER') {
        return res.status(403).json({ error: 'Owner access required' });
    }
    next();
}
export async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.adminUser.findUnique({
            where: { id: decoded.userId },
            include: { tenant: true },
        });
        if (user && user.tenant.status === 'ACTIVE') {
            req.user = {
                userId: user.id,
                tenantId: user.tenantId,
                email: user.email,
                role: user.role,
            };
            req.tenant = user.tenant;
        }
        next();
    }
    catch (error) {
        next();
    }
}
//# sourceMappingURL=auth.js.map