import { log } from '../utils/logger.js';
export function enforceTenantIsolation(req, res, next) {
    if (!req.user || !req.user.tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
    }
    req.getTenantFilter = () => ({
        tenantId: req.user.tenantId,
    });
    next();
}
export function preventTenantTampering(req, res, next) {
    if (req.body && req.body.tenantId) {
        log.warn('Attempt to tamper with tenantId in request body', {
            userId: req.user?.userId,
            providedTenantId: req.body.tenantId,
            actualTenantId: req.user?.tenantId,
        });
        delete req.body.tenantId;
    }
    next();
}
export function validateResourceOwnership(req, res, next) {
    if (!req.user || !req.tenant) {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
}
//# sourceMappingURL=tenant.js.map