import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbStore } from '../db/store.js';
import { UserProfile, UserRole } from '../types/index.js';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'parul_leaddesk_dev_jwt_super_secret_key_2026_safe';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    username: string;
  };
  profile?: UserProfile;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication token required',
        code: 'AUTH_TOKEN_MISSING',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    let payload: any;

    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication session',
        code: 'AUTH_TOKEN_INVALID',
      });
      return;
    }

    const userId = payload.sub || payload.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Invalid token claims',
        code: 'AUTH_CLAIMS_INVALID',
      });
      return;
    }

    const profile = await dbStore.getUserById(userId);
    if (!profile) {
      res.status(401).json({
        success: false,
        message: 'User profile not found in system',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    if (!profile.is_active) {
      res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your manager.',
        code: 'ACCOUNT_DEACTIVATED',
      });
      return;
    }

    req.user = {
      id: profile.id,
      role: profile.role,
      username: profile.username,
    };
    req.profile = profile;

    // Enforce forced password change requirement
    const allowedWhenMustChange = [
      '/api/users/me/change-password',
      '/api/auth/change-password',
      '/api/me',
      '/api/auth/me',
      '/me/change-password',
      '/change-password',
      '/me',
    ];
    const requestedPath = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
    const isAllowedPath = allowedWhenMustChange.some((allowed) => requestedPath.endsWith(allowed));

    if (profile.must_change_password && !isAllowedPath) {
      res.status(403).json({
        success: false,
        message: 'Temporary password active. You must change your password before continuing.',
        code: 'MUST_CHANGE_PASSWORD',
        must_change_password: true,
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication verification failure',
      code: 'AUTH_INTERNAL_ERROR',
    });
  }
};
