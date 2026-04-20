import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthClaims {
  sub: string;       // user id
  org_id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthClaims;
    }
  }
}

export function signToken(claims: AuthClaims): string {
  return jwt.sign(claims, config.jwt.secret, { expiresIn: config.jwt.expiresIn as any });
}

export function verifyToken(token: string): AuthClaims {
  return jwt.verify(token, config.jwt.secret) as AuthClaims;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' });
  }
  try {
    req.auth = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
