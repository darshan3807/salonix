import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Enforce that JWT_SECRET is strictly provided in process.env.
// No hardcoded secret, no default secret, no fallback secret.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.trim() === '') {
  console.error('\n======================================================');
  console.error('[FATAL CONFIGURATION ERROR] JWT_SECRET environment variable is missing.');
  console.error('The server requires process.env.JWT_SECRET to run securely.');
  console.error('Please configure JWT_SECRET in your environment variables.');
  console.error('======================================================\n');
  throw new Error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing.');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtUserPayload {
  id: number | string;
  uid: string;
  email: string;
  role: 'customer' | 'owner' | 'admin';
  salonId?: string | null;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

/**
 * Generate a signed JWT token containing only identity and authorization claims
 */
export function generateToken(payload: JwtUserPayload): string {
  return jwt.sign(
    {
      id: payload.id,
      uid: payload.uid,
      email: payload.email,
      role: payload.role,
      salonId: payload.salonId || null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as any }
  );
}

/**
 * Middleware: Verifies JWT token from Authorization: Bearer <token>
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Missing or malformed token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    req.user = {
      id: decoded.id,
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      salonId: decoded.salonId || null,
    };
    return next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

/**
 * Middleware: Role check for one or more permitted roles
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden. You do not have permission to access this resource.',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    return next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireSalonOwner = requireRole('owner');
export const requireCustomer = requireRole('customer');
