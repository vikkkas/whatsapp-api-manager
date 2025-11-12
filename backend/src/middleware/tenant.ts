import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger.js';

/**
 * Ensure all database queries are scoped to the authenticated tenant
 * This middleware should be used after authenticate middleware
 */
export function enforceTenantIsolation(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.tenantId) {
    return res.status(401).json({ error: 'Tenant context required' });
  }

  // Add helper to ensure tenant filtering
  (req as any).getTenantFilter = () => ({
    tenantId: req.user!.tenantId,
  });

  next();
}

/**
 * Validate request body doesn't contain tenantId tampering
 */
export function preventTenantTampering(req: Request, res: Response, next: NextFunction) {
  if (req.body && req.body.tenantId) {
    log.warn('Attempt to tamper with tenantId in request body', {
      userId: req.user?.userId,
      providedTenantId: req.body.tenantId,
      actualTenantId: req.user?.tenantId,
    });

    // Remove tenantId from body to prevent tampering
    delete req.body.tenantId;
  }

  next();
}

/**
 * Attach tenant to request params for validation
 */
export function validateResourceOwnership(req: Request, res: Response, next: NextFunction) {
  // This can be extended to validate specific resource ownership
  // For now, it ensures the user has a valid tenant context
  if (!req.user || !req.tenant) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
}
