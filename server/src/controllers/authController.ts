import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbStore } from '../db/store.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

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

// Public Registration for Employees ONLY
export const registerEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { full_name, username, email, password, team, phone } = req.body;

    // Check duplicate username or email
    const existing = await dbStore.getUserByUsernameOrEmail(username);
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'Username or email is already registered in the system',
        code: 'USER_ALREADY_EXISTS',
      });
      return;
    }

    // Role is strictly enforced as employee
    const newUser = await dbStore.createUser({
      full_name,
      username,
      email,
      role: 'employee',
      team: team || 'Team A',
      phone: phone || null,
      password,
    });

    // Also sync to Supabase if configured
    if (supabaseAdmin) {
      try {
        const { data: authData } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { username, full_name, role: 'employee' },
        });
        if (authData?.user?.id) {
          await supabaseAdmin.from('profiles').upsert({
            id: authData.user.id,
            full_name,
            username,
            email,
            role: 'employee',
            team: team || 'Team A',
            phone: phone || null,
            is_active: true,
          });
        }
      } catch (sbErr) {
        console.warn('Optional Supabase background sync on register:', sbErr);
      }
    }

    // Generate JWT
    const token = jwt.sign(
      {
        sub: newUser.id,
        id: newUser.id,
        role: newUser.role,
        username: newUser.username,
        email: newUser.email,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Counsellor registration successful! Welcome to Parul LeadDesk.',
      token,
      user: newUser,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed',
      code: 'REGISTRATION_FAILED',
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
