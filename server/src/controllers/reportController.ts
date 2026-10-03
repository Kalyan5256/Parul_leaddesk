import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore } from '../db/store.js';

export const getKPIs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const filters = {
      employee_id: targetEmployeeId,
      team: targetTeam,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const kpis = await dbStore.getKPIs(filters);
    res.json({
      success: true,
      data: kpis,
    });
  } catch (error) {
    console.error('getKPIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute dashboard metrics',
      code: 'METRICS_CALCULATION_FAILED',
    });
  }
};

export const getEmployeeLeaderboard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userRole = req.profile!.role;
    const userTeam = req.profile!.team;

    let targetTeam: string | undefined = req.query.team as string | undefined;
    if (userRole === 'team_lead') {
      targetTeam = userTeam || undefined;
    }

    const leaderboard = await dbStore.getEmployeeLeaderboard({ team: targetTeam });
    res.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to compute employee leaderboard',
      code: 'LEADERBOARD_FAILED',
    });
  }
};

export const getNotSubmitted = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const employees = await dbStore.getNotSubmittedEmployees(dateStr);

    res.json({
      success: true,
      data: employees,
      date: dateStr,
      count: employees.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unsubmitted employees',
      code: 'NOT_SUBMITTED_FAILED',
    });
  }
};

export const getTrend = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    const trend = await dbStore.getTrend(days, {
      team: targetTeam,
      employee_id: targetEmployeeId,
    });

    res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve lead trends',
      code: 'TREND_FAILED',
    });
  }
};

export const getTypeSplit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const split = await dbStore.getTypeSplit({
      team: targetTeam,
      employee_id: targetEmployeeId,
    });

    res.json({
      success: true,
      data: split,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve lead distributions',
      code: 'DISTRIBUTION_FAILED',
    });
  }
};

export const getDailySummary = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const employeeId = (req.query.employee_id as string) || req.profile!.id;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const report = await dbStore.getDailySummary(employeeId, date);
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve daily summary',
      code: 'DAILY_SUMMARY_FAILED',
    });
  }
};
