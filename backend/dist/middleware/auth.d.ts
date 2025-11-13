import { Request, Response, NextFunction } from 'express';
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
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>>>;
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
export declare function requireOwner(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map