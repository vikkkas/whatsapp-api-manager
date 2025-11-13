import { Request, Response, NextFunction } from 'express';
export declare function enforceTenantIsolation(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
export declare function preventTenantTampering(req: Request, res: Response, next: NextFunction): void;
export declare function validateResourceOwnership(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
//# sourceMappingURL=tenant.d.ts.map