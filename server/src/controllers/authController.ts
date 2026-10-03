import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbStore } from '../db/store.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'parul_leaddesk_dev_jwt_super_secret_key_2026_safe';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    const user = await dbStore.getUserByUsernameOrEmail(username);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid username/email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact an administrator.',
        code: 'ACCOUNT_DEACTIVATED',
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: 'Invalid username/email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Generate JWT
    const token = jwt.sign(
      {
        sub: user.id,
        id: user.id,
        role: user.role,
        username: user.username,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...profile } = user;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: profile,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      code: 'AUTH_FAILED',
    });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.profile) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
        code: 'UNAUTHENTICATED',
      });
      return;
    }

    res.json({
      success: true,
      user: req.profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve current profile',
      code: 'PROFILE_RETRIEVAL_ERROR',
    });
  }
};

export const syncProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.profile) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
        code: 'UNAUTHENTICATED',
      });
      return;
    }

    res.json({
      success: true,
      profile: req.profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to sync profile',
      code: 'PROFILE_SYNC_ERROR',
    });
  }
};
