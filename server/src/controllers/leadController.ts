import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
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

export const getNotInterestedCount = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const count = await dbStore.getNotInterestedLeadsCount();
    res.json({
      success: true,
      count,
    });
  } catch (error: any) {
    console.error('getNotInterestedCount error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve count of Not Interested leads',
      code: 'COUNT_FETCH_FAILED',
    });
  }
};

let isExportAndDeleteRunning = false;

export const exportAndDeleteNotInterested = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  // Prevent duplicate or concurrent executions
  if (isExportAndDeleteRunning) {
    res.status(409).json({
      success: false,
      message:
        'An export and delete operation is already in progress. Please wait for it to complete.',
      code: 'OPERATION_IN_PROGRESS',
    });
    return;
  }

  isExportAndDeleteRunning = true;
  try {
    const actor = req.profile!;
    const actorId = actor.id;
    const actorRole = actor.role;

    if (actorRole !== 'admin' && actorRole !== 'manager') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only managers and administrators can export and delete leads',
        code: 'FORBIDDEN',
      });
      return;
    }

    // Step 1: Retrieve only leads whose status is 'Not Interested'
    const { leads: notInterestedLeads, followUps } =
      await dbStore.getNotInterestedLeadsWithHistory();

    if (notInterestedLeads.length === 0) {
      res.json({
        success: true,
        message: 'No leads marked "Not Interested" were found. No exports generated.',
        exportedCount: 0,
        deletedCount: 0,
      });
      return;
    }

    const leadIds = notInterestedLeads.map((l) => l.id);

    // Step 2: Generate Excel (.xlsx) file with full details
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Parul LeadDesk CRM';
    workbook.lastModifiedBy = actor.full_name;
    workbook.created = new Date();
    workbook.modified = new Date();

    // Sheet 1: Not Interested Leads
    const leadsSheet = workbook.addWorksheet('Not Interested Leads', {
      views: [{ showGridLines: true }],
    });

    leadsSheet.columns = [
      { header: 'Lead ID', key: 'id', width: 36 },
      { header: 'Student Name', key: 'lead_name', width: 26 },
      { header: 'Mobile Number', key: 'mobile', width: 18 },
      { header: 'Course Interest', key: 'course', width: 32 },
      { header: 'Channel / Source', key: 'lead_type', width: 16 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Assigned Counsellor', key: 'employee_name', width: 24 },
      { header: 'Counsellor ID', key: 'employee_id', width: 36 },
      { header: 'Report Date', key: 'report_date', width: 14 },
      { header: 'Follow-up Date', key: 'follow_up_date', width: 16 },
      { header: 'Remarks / Notes', key: 'remarks', width: 35 },
      { header: 'Total Follow-ups', key: 'follow_up_count', width: 16 },
      { header: 'Created Date', key: 'created_at', width: 22 },
      { header: 'Last Updated', key: 'updated_at', width: 22 },
    ];

    const headerRow = leadsSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    headerRow.height = 26;

    // Follow-up count mapping
    const fuCountMap = new Map<string, number>();
    for (const f of followUps) {
      fuCountMap.set(f.lead_id, (fuCountMap.get(f.lead_id) || 0) + 1);
    }

    // Add rows
    for (const lead of notInterestedLeads) {
      leadsSheet.addRow({
        id: lead.id,
        lead_name: lead.lead_name,
        mobile: lead.mobile,
        course: lead.course,
        lead_type: lead.lead_type,
        status: lead.status,
        employee_name: lead.employee_name || 'Unassigned',
        employee_id: lead.employee_id,
        report_date: lead.report_date,
        follow_up_date: lead.follow_up_date || 'N/A',
        remarks: lead.remarks || 'None',
        follow_up_count: fuCountMap.get(lead.id) || 0,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
      });
    }

    // Sheet 2: Follow-up History
    const fuSheet = workbook.addWorksheet('Follow-up History', {
      views: [{ showGridLines: true }],
    });

    fuSheet.columns = [
      { header: 'Follow-up ID', key: 'id', width: 36 },
      { header: 'Lead ID', key: 'lead_id', width: 36 },
      { header: 'Student Name', key: 'lead_name', width: 26 },
      { header: 'Mobile Number', key: 'lead_mobile', width: 18 },
      { header: 'Counsellor', key: 'employee_name', width: 24 },
      { header: 'Scheduled Date', key: 'follow_up_date', width: 16 },
      { header: 'Scheduled Time', key: 'follow_up_time', width: 16 },
      { header: 'Follow-up Status', key: 'status', width: 18 },
      { header: 'Discussion Note', key: 'note', width: 40 },
      { header: 'Completed At', key: 'completed_at', width: 22 },
      { header: 'Created Date', key: 'created_at', width: 22 },
    ];

    const fuHeaderRow = fuSheet.getRow(1);
    fuHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    fuHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    fuHeaderRow.height = 26;

    for (const fu of followUps) {
      fuSheet.addRow({
        id: fu.id,
        lead_id: fu.lead_id,
        lead_name: fu.lead_name || 'N/A',
        lead_mobile: fu.lead_mobile || 'N/A',
        employee_name: fu.employee_name || 'Staff',
        follow_up_date: fu.follow_up_date,
        follow_up_time: fu.follow_up_time || 'N/A',
        status: fu.status,
        note: fu.note || 'None',
        completed_at: fu.completed_at || 'N/A',
        created_at: fu.created_at,
      });
    }

    // Step 3: Store the file securely using storage infrastructure
    const storageDir = path.resolve(process.cwd(), 'storage', 'exports');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomHex = Math.random().toString(36).slice(2, 8);
    const filename = `not_interested_leads_${timestamp}_${randomHex}.xlsx`;
    const filePath = path.join(storageDir, filename);

    await workbook.xlsx.writeFile(filePath);

    // Step 4: Verify the export file was generated and stored successfully
    const fileExists = fs.existsSync(filePath);
    const fileStat = fileExists ? fs.statSync(filePath) : null;
    if (!fileExists || !fileStat || fileStat.size === 0) {
      throw new Error(
        'Export file generation failed verification check: file is missing or zero bytes'
      );
    }

    // Step 5: Only after successful verification, delete the exported leads
    const deletedCount = await dbStore.deleteNotInterestedLeads(leadIds);

    // Step 6: Record in Audit Log
    try {
      await dbStore.addAuditLog({
        target_user_id: actorId,
        target_user_name: actor.full_name,
        performed_by: actorId,
        performed_by_name: actor.full_name,
        action: 'EXPORT_DELETE_NOT_INTERESTED',
        metadata: {
          exported_count: notInterestedLeads.length,
          deleted_count: deletedCount,
          filename,
          file_size_bytes: fileStat.size,
          result: 'SUCCESS',
        },
      });
    } catch (auditErr) {
      console.warn('Audit log write notice:', auditErr);
    }

    res.json({
      success: true,
      message: `Successfully exported and deleted ${deletedCount} 'Not Interested' leads. Archive stored securely.`,
      exportedCount: notInterestedLeads.length,
      deletedCount,
      filename,
    });
  } catch (error: any) {
    console.error('exportAndDeleteNotInterested error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export and delete Not Interested leads',
      code: 'EXPORT_DELETE_FAILED',
    });
  } finally {
    isExportAndDeleteRunning = false;
  }
};

export const downloadExportFile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const actorRole = req.profile!.role;
    if (actorRole !== 'admin' && actorRole !== 'manager') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions to access export archive',
        code: 'FORBIDDEN',
      });
      return;
    }

    const filename = path.basename(req.params.filename);
    const storageDir = path.resolve(process.cwd(), 'storage', 'exports');
    const filePath = path.join(storageDir, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'Archive file not found or has expired',
        code: 'FILE_NOT_FOUND',
      });
      return;
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error: any) {
    console.error('downloadExportFile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download export file',
      code: 'DOWNLOAD_FAILED',
    });
  }
};

