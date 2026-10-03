import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore } from '../db/store.js';

export const getAllUsers = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const users = await dbStore.getAllUsers();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      code: 'USER_FETCH_FAILED',
    });
  }
};

export const createUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { full_name, username, email, role, team, phone, password } = req.body;

    // Check duplicate username or email
    const existing = await dbStore.getUserByUsernameOrEmail(username);
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'Username or email already exists in system',
        code: 'USER_ALREADY_EXISTS',
      });
      return;
    }

    const newUser = await dbStore.createUser({
      full_name,
      username,
      email,
      role,
      team,
      phone,
      password: password || '1234',
    });

    res.status(201).json({
      success: true,
      message: `User '${username}' created successfully`,
      data: newUser,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create user',
      code: 'USER_CREATE_FAILED',
    });
  }
};

export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await dbStore.updateUser(id, req.body);
    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      message: 'User details updated successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update user',
      code: 'USER_UPDATE_FAILED',
    });
  }
};

export const updateUserStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const updated = await dbStore.updateUserStatus(id, is_active);
    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      message: `User status changed to ${is_active ? 'active' : 'inactive'}`,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      code: 'USER_STATUS_UPDATE_FAILED',
    });
  }
};
