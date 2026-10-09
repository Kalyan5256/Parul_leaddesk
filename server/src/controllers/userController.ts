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

    const result = await dbStore.createUser({
      full_name,
      username,
      email,
      role,
      team,
      phone,
      password,
    });

    res.status(201).json({
      success: true,
      message: `User '${username}' created successfully. Temporary credentials provisioned.`,
      data: result,
      temporaryPassword: result.temporaryPassword,
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

    try {
      await dbStore.addAuditLog({
        target_user_id: id,
        target_user_name: updated.full_name,
        performed_by: req.profile?.id || 'system',
        performed_by_name: req.profile?.full_name || 'Manager',
        action: 'USER_UPDATED',
        metadata: req.body,
      });
    } catch (auditErr) {
      console.warn('Audit log write notice:', auditErr);
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

    try {
      await dbStore.addAuditLog({
        target_user_id: id,
        target_user_name: updated.full_name,
        performed_by: req.profile?.id || 'system',
        performed_by_name: req.profile?.full_name || 'Manager',
        action: is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        metadata: { is_active },
      });
    } catch (auditErr) {
      console.warn('Audit log write notice:', auditErr);
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

export const resetEmployeePassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const managerId = req.profile!.id;

    const targetUser = await dbStore.getUserById(id);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: 'Target employee not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    if (targetUser.role === 'admin' && req.profile!.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Cannot reset credentials of an administrator',
        code: 'FORBIDDEN',
      });
      return;
    }

    const result = await dbStore.resetEmployeePassword(id, managerId);

    res.json({
      success: true,
      message: `Temporary password generated for ${targetUser.full_name}. Provide this to the employee.`,
      temporaryPassword: result.temporaryPassword,
      user: result.targetUser,
    });
  } catch (error: any) {
    console.error('resetEmployeePassword error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset password',
      code: 'RESET_PASSWORD_FAILED',
    });
  }
};

export const changeOwnPassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.profile!.id;
    const newPassword = req.body.newPassword || req.body.new_password;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
        code: 'INVALID_PASSWORD',
      });
      return;
    }

    const success = await dbStore.changeOwnPassword(userId, newPassword);
    if (!success) {
      res.status(404).json({
        success: false,
        message: 'User account not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Password updated successfully. You now have full access to LeadDesk.',
    });
  } catch (error: any) {
    console.error('changeOwnPassword error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update password',
      code: 'CHANGE_PASSWORD_FAILED',
    });
  }
};

