import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore } from '../db/store.js';
import { LeadStatus, LeadType } from '../types/index.js';

export const getLeads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.profile!.role;
    const userId = req.profile!.id;

    let targetEmployeeId: string | undefined = req.query.employee_id as string | undefined;

    // Strict Security Isolation (Section 1, 8, 14, 56)
    // Employees can NEVER see another employee's leads regardless of query parameters
    if (userRole === 'employee') {
      targetEmployeeId = userId;
    }

    const filters = {
      employee_id: targetEmployeeId,
      status: req.query.status as string,
      lead_type: req.query.lead_type as string,
      course: req.query.course as string,
      search: req.query.search as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const { leads, total } = await dbStore.getLeads(filters);

    res.json({
      success: true,
      data: leads,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  } catch (error: any) {
    console.error('getLeads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leads',
      code: 'LEAD_FETCH_FAILED',
    });
  }
};

export const getLeadById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userRole = req.profile!.role;
    const userId = req.profile!.id;
    const userTeam = req.profile!.team;

    const lead = await dbStore.getLeadById(id);
    if (!lead) {
      res.status(404).json({
        success: false,
        message: 'Lead record not found',
        code: 'LEAD_NOT_FOUND',
      });
      return;
    }

    // Role-based authorization check (Section 56 Critical Security Test)
    if (userRole === 'employee' && lead.employee_id !== userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view another employee lead',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve lead details',
      code: 'LEAD_FETCH_FAILED',
    });
  }
};

export const bulkCreateLeads = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { report_date, leads } = req.body;
    const userRole = req.profile!.role;

    // Determine target employee: employees can only submit for themselves
    let employeeId = req.profile!.id;
    if ((userRole === 'manager' || userRole === 'admin') && req.body.employee_id) {
      employeeId = req.body.employee_id;
    }

    // Check same-day previous submission notice:
    const existingSummary = await dbStore.getDailySummary(employeeId, report_date);
    const wasAlreadySubmittedToday = Boolean(existingSummary && existingSummary.lead_count > 0);
    const previousCount = existingSummary?.lead_count || 0;

    const result = await dbStore.submitBulkLeads(employeeId, report_date, leads);

    const onlineCount = leads.filter((l: any) => l.lead_type === 'online').length;
    const offlineCount = leads.filter((l: any) => l.lead_type === 'offline').length;

    res.status(201).json({
      success: true,
      message: `${result.insertedCount} leads submitted successfully for ${report_date}`,
      summary: {
        totalSubmittedThisBatch: result.insertedCount,
        totalDayLeads: result.dailyReport.lead_count,
        onlineCount,
        offlineCount,
        reportDate: report_date,
        wasAdditive: wasAlreadySubmittedToday,
        previousDayCount: previousCount,
      },
      data: result.leads,
    });
  } catch (error: any) {
    console.error('bulkCreateLeads error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Unable to submit leads',
      code: 'LEAD_SUBMISSION_FAILED',
    });
  }
};

export const checkDuplicates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { mobiles } = req.body;
    if (!Array.isArray(mobiles) || mobiles.length === 0) {
      res.json({ success: true, duplicates: [] });
      return;
    }

    const duplicates = await dbStore.checkDuplicateMobiles(mobiles);
    res.json({
      success: true,
      duplicates,
      count: duplicates.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify mobile duplicates',
      code: 'DUPLICATE_CHECK_FAILED',
    });
  }
};

export const updateLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const modifierId = req.profile!.id;
    const modifierRole = req.profile!.role;

    const updated = await dbStore.updateLead(id, req.body, modifierId, modifierRole);
    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'Lead not found',
        code: 'LEAD_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update lead',
      code: 'LEAD_UPDATE_FAILED',
    });
  }
};

export const deleteLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await dbStore.deleteLead(id);
    if (!success) {
      res.status(404).json({
        success: false,
        message: 'Lead not found or already removed',
        code: 'LEAD_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Lead removed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete lead',
      code: 'LEAD_DELETE_FAILED',
    });
  }
};

export const assignLeads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { lead_ids, target_employee_id } = req.body;
    const count = await dbStore.assignLeads(lead_ids, target_employee_id);

    res.json({
      success: true,
      message: `Successfully reassigned ${count} leads`,
      count,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to assign leads',
      code: 'LEAD_ASSIGN_FAILED',
    });
  }
};

export const exportLeads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.profile!.role;
    const userId = req.profile!.id;

    let targetEmployeeId: string | undefined = req.query.employee_id as string | undefined;

    // Critical Security: Employee can NEVER export another employee's leads
    if (userRole === 'employee') {
      targetEmployeeId = userId;
    }

    const { leads } = await dbStore.getLeads({
      employee_id: targetEmployeeId,
      status: req.query.status as string,
      lead_type: req.query.lead_type as string,
      course: req.query.course as string,
      search: req.query.search as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      limit: 10000,
    });

    // Format CSV
    const headers = [
      'Report Date',
      'Lead Name',
      'Mobile Number',
      'Lead Type',
      'Course',
      'Status',
      'Follow-up Date',
      'Counsellor',
      'Remarks',
      'Created At',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leads.map((l) => [
      escapeCsv(l.report_date),
      escapeCsv(l.lead_name),
      escapeCsv(l.mobile),
      escapeCsv(l.lead_type),
      escapeCsv(l.course),
      escapeCsv(l.status),
      escapeCsv(l.follow_up_date || 'N/A'),
      escapeCsv(l.employee_name || 'N/A'),
      escapeCsv(l.remarks || ''),
      escapeCsv(l.created_at),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="parul-leaddesk-export-${Date.now()}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('exportLeads error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export leads',
      code: 'LEAD_EXPORT_FAILED',
    });
  }
};
