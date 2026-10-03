import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore } from '../db/store.js';

export const getFollowUps = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userRole = req.profile!.role;
    const userId = req.profile!.id;
    const userTeam = req.profile!.team;

    let targetEmployeeId: string | undefined = req.query.employee_id as string | undefined;
    let targetTeam: string | undefined = req.query.team as string | undefined;

    if (userRole === 'employee') {
      targetEmployeeId = userId;
      targetTeam = undefined;
    } else if (userRole === 'team_lead') {
      targetTeam = userTeam || undefined;
    }

    const group = req.query.group as 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED' | 'ALL';

    const followUps = await dbStore.getFollowUps({
      employee_id: targetEmployeeId,
      team: targetTeam,
      group: group || 'ALL',
    });

    res.json({
      success: true,
      data: followUps,
      count: followUps.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve follow-ups',
      code: 'FOLLOWUP_FETCH_FAILED',
    });
  }
};

export const addFollowUp = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { lead_id, follow_up_date, follow_up_time, status, note } = req.body;
    const employee_id = req.profile!.id;

    if (!lead_id || !follow_up_date || !status) {
      res.status(400).json({
        success: false,
        message: 'Lead ID, follow-up date, and status are required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const fu = await dbStore.addFollowUp({
      lead_id,
      employee_id,
      follow_up_date,
      follow_up_time,
      status,
      note,
    });

    res.status(201).json({
      success: true,
      message: 'Follow-up logged successfully',
      data: fu,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to record follow-up',
      code: 'FOLLOWUP_CREATE_FAILED',
    });
  }
};

export const updateFollowUp = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await dbStore.updateFollowUp(id, req.body);
    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'Follow-up not found',
        code: 'FOLLOWUP_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Follow-up updated successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update follow-up',
      code: 'FOLLOWUP_UPDATE_FAILED',
    });
  }
};
