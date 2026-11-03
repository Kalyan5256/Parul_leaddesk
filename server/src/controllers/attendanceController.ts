import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { dbStore } from '../db/store.js';
import {
  generateChallengeNonce,
  verifyDeviceSignature,
} from '../utils/cryptoVerification.js';
import {
  getKolkataDateString,
  getMonthDateRange,
} from '../utils/timezone.js';
import { AttendanceExportService } from '../utils/attendanceExport.js';

// ============================================================================
// EMPLOYEE ATTENDANCE OPERATIONS
// ============================================================================

/**
 * Generates a single-use cryptographic challenge for attendance check-in/out.
 */
export const requestAttendanceChallenge = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const employeeId = req.profile!.id;
    const { deviceId } = req.body;

    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: 'Device ID is required to issue an attendance challenge',
        code: 'DEVICE_ID_REQUIRED',
      });
      return;
    }

    const device = await dbStore.getDeviceById(deviceId);
    if (!device || device.employee_id !== employeeId) {
      res.status(403).json({
        success: false,
        message: 'Device is not registered to your employee account',
        code: 'DEVICE_NOT_RECOGNIZED',
      });
      return;
    }

    if (device.status === 'pending') {
      res.status(403).json({
        success: false,
        message:
          'This office laptop is pending administrator approval. Please contact your administrator.',
        code: 'DEVICE_APPROVAL_PENDING',
      });
      return;
    }

    if (device.status === 'revoked') {
      res.status(403).json({
        success: false,
        message: `This office laptop has been revoked. Reason: ${device.revocation_reason || 'Administrative action'}.`,
        code: 'DEVICE_REVOKED',
      });
      return;
    }

    const nonce = generateChallengeNonce();
    // 2-minute expiration window to prevent stale replay
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    await dbStore.createAttendanceChallenge(employeeId, deviceId, nonce, expiresAt);

    res.json({
      success: true,
      nonce,
      expiresAt,
    });
  } catch (error: any) {
    console.error('requestAttendanceChallenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate attendance challenge',
      code: 'CHALLENGE_GENERATION_FAILED',
    });
  }
};

/**
 * Records employee check-in after verifying device cryptographic signature.
 */
export const checkIn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.profile!.id;
    const { deviceId, nonce, signature, notes, status } = req.body;

    if (!deviceId || !nonce || !signature) {
      res.status(400).json({
        success: false,
        message: 'Device ID, challenge nonce, and cryptographic signature are required',
        code: 'ATTENDANCE_CREDENTIALS_MISSING',
      });
      return;
    }

    // 1. Verify device authorization
    const device = await dbStore.getDeviceById(deviceId);
    if (!device || device.employee_id !== employeeId) {
      res.status(403).json({
        success: false,
        message: 'Unauthorized device: device is not associated with this employee account',
        code: 'DEVICE_UNAUTHORIZED',
      });
      return;
    }

    if (device.status !== 'approved') {
      res.status(403).json({
        success: false,
        message: `Attendance prohibited: device status is ${device.status}. Explicit admin approval is required.`,
        code: 'DEVICE_NOT_APPROVED',
      });
      return;
    }

    // 2. Consume challenge nonce (strictly single-use, anti-replay)
    const isChallengeValid = await dbStore.consumeAttendanceChallenge(
      nonce,
      employeeId,
      deviceId
    );

    if (!isChallengeValid) {
      res.status(400).json({
        success: false,
        message: 'Challenge nonce is invalid, expired, or previously consumed',
        code: 'CHALLENGE_INVALID',
      });
      return;
    }

    // 3. Cryptographically verify device-bound ECDSA signature
    const expectedMessage = `ParulAttendance:${employeeId}:${deviceId}:${nonce}`;
    const isSignatureValid = await verifyDeviceSignature(
      device.public_key,
      expectedMessage,
      signature
    );

    if (!isSignatureValid) {
      res.status(400).json({
        success: false,
        message: 'Cryptographic signature verification failed: private key proof mismatch',
        code: 'DEVICE_SIGNATURE_MISMATCH',
      });
      return;
    }

    // 4. Create check-in record
    const record = await dbStore.checkInEmployee(employeeId, deviceId, notes, status);

    res.status(201).json({
      success: true,
      message: 'Attendance check-in logged successfully',
      data: record,
    });
  } catch (error: any) {
    if (error.message && error.message.includes('already checked in')) {
      res.status(409).json({
        success: false,
        message: error.message,
        code: 'ATTENDANCE_ALREADY_CHECKED_IN',
      });
      return;
    }
    console.error('checkIn error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Check-in failed due to an internal error',
      code: 'CHECK_IN_FAILED',
    });
  }
};

/**
 * Records employee check-out after verifying device cryptographic signature.
 */
export const checkOut = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const employeeId = req.profile!.id;
    const { deviceId, nonce, signature, notes, status } = req.body;

    if (!deviceId || !nonce || !signature) {
      res.status(400).json({
        success: false,
        message: 'Device ID, challenge nonce, and cryptographic signature are required',
        code: 'ATTENDANCE_CREDENTIALS_MISSING',
      });
      return;
    }

    // 1. Verify device authorization
    const device = await dbStore.getDeviceById(deviceId);
    if (!device || device.employee_id !== employeeId) {
      res.status(403).json({
        success: false,
        message: 'Unauthorized device: device is not associated with this employee account',
        code: 'DEVICE_UNAUTHORIZED',
      });
      return;
    }

    if (device.status !== 'approved') {
      res.status(403).json({
        success: false,
        message: `Attendance prohibited: device status is ${device.status}. Explicit admin approval is required.`,
        code: 'DEVICE_NOT_APPROVED',
      });
      return;
    }

    // 2. Consume challenge nonce (strictly single-use)
    const isChallengeValid = await dbStore.consumeAttendanceChallenge(
      nonce,
      employeeId,
      deviceId
    );

    if (!isChallengeValid) {
      res.status(400).json({
        success: false,
        message: 'Challenge nonce is invalid, expired, or previously consumed',
        code: 'CHALLENGE_INVALID',
      });
      return;
    }

    // 3. Cryptographically verify device-bound ECDSA signature
    const expectedMessage = `ParulAttendance:${employeeId}:${deviceId}:${nonce}`;
    const isSignatureValid = await verifyDeviceSignature(
      device.public_key,
      expectedMessage,
      signature
    );

    if (!isSignatureValid) {
      res.status(400).json({
        success: false,
        message: 'Cryptographic signature verification failed: private key proof mismatch',
        code: 'DEVICE_SIGNATURE_MISMATCH',
      });
      return;
    }

    // 4. Update check-out record
    const record = await dbStore.checkOutEmployee(employeeId, deviceId, notes, status);

    res.json({
      success: true,
      message: 'Attendance check-out logged successfully',
      data: record,
    });
  } catch (error: any) {
    if (error.message && error.message.includes('No check-in record found')) {
      res.status(400).json({
        success: false,
        message: error.message,
        code: 'NO_CHECK_IN_FOUND',
      });
      return;
    }
    if (error.message && error.message.includes('already checked out')) {
      res.status(409).json({
        success: false,
        message: error.message,
        code: 'ATTENDANCE_ALREADY_CHECKED_OUT',
      });
      return;
    }
    console.error('checkOut error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Check-out failed due to an internal error',
      code: 'CHECK_OUT_FAILED',
    });
  }
};

/**
 * Returns today's attendance record for the logged-in employee.
 */
export const getTodayAttendance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const employeeId = req.profile!.id;
    const record = await dbStore.getTodayAttendance(employeeId);
    res.json({
      success: true,
      data: record,
      today: getKolkataDateString(),
    });
  } catch (error) {
    console.error('getTodayAttendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve today attendance status',
      code: 'ATTENDANCE_FETCH_FAILED',
    });
  }
};

/**
 * Returns personal monthly attendance history for the logged-in employee.
 */
export const getMyAttendanceHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const employeeId = req.profile!.id;
    const month = (req.query.month as string) || getKolkataDateString().substring(0, 7);

    const { startDate, endDate } = getMonthDateRange(month);
    const records = await dbStore.getAttendanceHistory(employeeId, startDate, endDate);

    res.json({
      success: true,
      data: records,
      month,
      startDate,
      endDate,
    });
  } catch (error: any) {
    console.error('getMyAttendanceHistory error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch personal attendance history',
      code: 'HISTORY_FETCH_FAILED',
    });
  }
};

/**
 * Registers an employee's office laptop (creates a pending record).
 */
export const registerOfficeDevice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const employeeId = req.profile!.id;
    const { deviceName, publicKey, keyAlgorithm, metadata } = req.body;

    if (!deviceName || !publicKey) {
      res.status(400).json({
        success: false,
        message: 'Device name and cryptographic public key are required for registration',
        code: 'REGISTRATION_PARAMETERS_MISSING',
      });
      return;
    }

    const userAgent = req.headers['user-agent'];
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

    const device = await dbStore.registerDevice({
      employee_id: employeeId,
      device_name: deviceName,
      public_key: typeof publicKey === 'string' ? publicKey : JSON.stringify(publicKey),
      key_algorithm: keyAlgorithm || 'ECDSA-P256',
      user_agent: userAgent,
      ip_address: ipAddress,
      metadata,
    });

    res.status(201).json({
      success: true,
      message:
        'Office laptop registered successfully. Attendance operations will be enabled after Administrator approval.',
      data: device,
    });
  } catch (error: any) {
    console.error('registerOfficeDevice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Device registration failed',
      code: 'DEVICE_REGISTRATION_FAILED',
    });
  }
};

/**
 * Returns devices registered to the currently logged-in employee.
 */
export const getMyRegisteredDevices = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const employeeId = req.profile!.id;
    const devices = await dbStore.getDevicesByEmployee(employeeId);
    res.json({
      success: true,
      data: devices,
    });
  } catch (error) {
    console.error('getMyRegisteredDevices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve registered devices',
      code: 'DEVICES_FETCH_FAILED',
    });
  }
};

// ============================================================================
// ADMINISTRATOR ATTENDANCE MANAGEMENT OPERATIONS
// ============================================================================

/**
 * Administrator: View daily attendance across all employees.
 */
export const getAdminDailyAttendance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const date = (req.query.date as string) || getKolkataDateString();
    const records = await dbStore.getDailyAttendance(date);

    res.json({
      success: true,
      data: records,
      date,
      count: records.length,
    });
  } catch (error) {
    console.error('getAdminDailyAttendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily attendance',
      code: 'ADMIN_DAILY_FETCH_FAILED',
    });
  }
};

/**
 * Administrator: View employees with missing check-outs from past dates.
 */
export const getAdminMissingCheckouts = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const records = await dbStore.getMissingCheckouts();
    res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    console.error('getAdminMissingCheckouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch missing checkouts',
      code: 'MISSING_CHECKOUTS_FETCH_FAILED',
    });
  }
};

/**
 * Administrator: View individual employee attendance records.
 */
export const getAdminEmployeeHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const month = (req.query.month as string) || getKolkataDateString().substring(0, 7);
    const { startDate, endDate } = getMonthDateRange(month);

    const employee = await dbStore.getUserById(employeeId);
    if (!employee) {
      res.status(404).json({
        success: false,
        message: 'Employee not found',
        code: 'EMPLOYEE_NOT_FOUND',
      });
      return;
    }

    const records = await dbStore.getAttendanceHistory(employeeId, startDate, endDate);

    res.json({
      success: true,
      employee,
      month,
      data: records,
    });
  } catch (error: any) {
    console.error('getAdminEmployeeHistory error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch employee attendance records',
      code: 'EMPLOYEE_HISTORY_FETCH_FAILED',
    });
  }
};

/**
 * Administrator: Correct attendance record with mandatory reason.
 */
export const correctAttendanceRecord = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.profile!.id;
    const { recordId, check_in_time, check_out_time, status, total_minutes, notes, reason } =
      req.body;

    if (!recordId) {
      res.status(400).json({
        success: false,
        message: 'Record ID is required',
        code: 'RECORD_ID_REQUIRED',
      });
      return;
    }

    if (!reason || !reason.trim()) {
      res.status(400).json({
        success: false,
        message: 'A mandatory explanation reason is required for administrative corrections',
        code: 'CORRECTION_REASON_MANDATORY',
      });
      return;
    }

    const updated = await dbStore.correctAttendanceRecord(
      recordId,
      { check_in_time, check_out_time, status, total_minutes, notes },
      adminId,
      reason
    );

    res.json({
      success: true,
      message: 'Attendance record corrected successfully and logged in audit history',
      data: updated,
    });
  } catch (error: any) {
    console.error('correctAttendanceRecord error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Attendance correction failed',
      code: 'CORRECTION_FAILED',
    });
  }
};

/**
 * Administrator: View registered employee devices.
 */
export const getAdminDevices = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const employeeId = req.query.employeeId as string | undefined;

    const devices = await dbStore.getAllDevices({ status, employee_id: employeeId });
    res.json({
      success: true,
      data: devices,
      count: devices.length,
    });
  } catch (error) {
    console.error('getAdminDevices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve employee devices',
      code: 'ADMIN_DEVICES_FETCH_FAILED',
    });
  }
};

/**
 * Administrator: Approve registered office laptop.
 */
export const approveDevice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.profile!.id;
    const { deviceId } = req.params;

    const device = await dbStore.updateDeviceStatus(deviceId, 'approved', adminId);

    res.json({
      success: true,
      message: `Device "${device.device_name}" approved successfully. Attendance operations are now active.`,
      data: device,
    });
  } catch (error: any) {
    console.error('approveDevice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve device',
      code: 'DEVICE_APPROVAL_FAILED',
    });
  }
};

/**
 * Administrator: Revoke registered office laptop.
 */
export const revokeDevice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.profile!.id;
    const { deviceId } = req.params;
    const { reason } = req.body;

    const device = await dbStore.updateDeviceStatus(deviceId, 'revoked', adminId, reason);

    res.json({
      success: true,
      message: `Device "${device.device_name}" revoked. Attendance access from this laptop is immediately blocked.`,
      data: device,
    });
  } catch (error: any) {
    console.error('revokeDevice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to revoke device',
      code: 'DEVICE_REVOCATION_FAILED',
    });
  }
};

/**
 * Administrator: View attendance audit logs.
 */
export const getAdminAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const employeeId = req.query.employeeId as string | undefined;
    const action = req.query.action as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    const logs = await dbStore.getAttendanceAuditLogs({ employee_id: employeeId, action, limit });

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error('getAdminAuditLogs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance audit logs',
      code: 'AUDIT_LOGS_FETCH_FAILED',
    });
  }
};

/**
 * Administrator: Generate calendar-month attendance report.
 */
export const getAdminMonthlyReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const month = (req.query.month as string) || getKolkataDateString().substring(0, 7);
    const report = await dbStore.getMonthlyAttendanceReport(month);

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('getAdminMonthlyReport error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate monthly attendance report',
      code: 'MONTHLY_REPORT_FAILED',
    });
  }
};

/**
 * Administrator: Export reports in Excel (.xlsx), CSV (.csv), or PDF (.pdf).
 */
export const exportAttendanceReport = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const format = ((req.query.format as string) || 'xlsx').toLowerCase();
    const view = ((req.query.view as string) || 'summary').toLowerCase();
    const month = (req.query.month as string) || getKolkataDateString().substring(0, 7);
    const date = (req.query.date as string) || getKolkataDateString();
    const employeeId = req.query.employeeId as string | undefined;

    const report = await dbStore.getMonthlyAttendanceReport(month);

    if (view === 'salary') {
      if (format === 'csv') {
        const csv = AttendanceExportService.generateSalaryCsv(report);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="salary-attendance-${month}.csv"`
        );
        res.status(200).send(csv);
        return;
      } else if (format === 'pdf') {
        const pdf = AttendanceExportService.generateSalaryPdf(report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="salary-attendance-${month}.pdf"`
        );
        res.status(200).send(pdf);
        return;
      } else {
        const excel = await AttendanceExportService.generateSalaryExcel(report);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="salary-attendance-${month}.xlsx"`
        );
        res.status(200).send(excel);
        return;
      }
    } else if (view === 'employee' && employeeId) {
      const employee = await dbStore.getUserById(employeeId);
      if (!employee) {
        res.status(404).json({ success: false, message: 'Employee not found' });
        return;
      }
      const { startDate, endDate } = getMonthDateRange(month);
      const records = await dbStore.getAttendanceHistory(employeeId, startDate, endDate);

      if (format === 'csv') {
        const csv = AttendanceExportService.generateIndividualCsv(employee, month, records);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="attendance-${employee.username}-${month}.csv"`
        );
        res.status(200).send(csv);
        return;
      } else if (format === 'pdf') {
        const pdf = AttendanceExportService.generateIndividualPdf(employee, month, records);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="attendance-${employee.username}-${month}.pdf"`
        );
        res.status(200).send(pdf);
        return;
      } else {
        const excel = await AttendanceExportService.generateIndividualExcel(employee, month, records);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="attendance-${employee.username}-${month}.xlsx"`
        );
        res.status(200).send(excel);
        return;
      }
    } else if (view === 'daily') {
      const records = await dbStore.getDailyAttendance(date);

      if (format === 'csv') {
        const csv = AttendanceExportService.generateDailyCsv(date, records);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="daily-attendance-${date}.csv"`);
        res.status(200).send(csv);
        return;
      } else if (format === 'pdf') {
        const pdf = AttendanceExportService.generateDailyPdf(date, records);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="daily-attendance-${date}.pdf"`);
        res.status(200).send(pdf);
        return;
      } else {
        const excel = await AttendanceExportService.generateDailyExcel(date, records);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="daily-attendance-${date}.xlsx"`
        );
        res.status(200).send(excel);
        return;
      }
    } else {
      // Default: All employees monthly summary
      if (format === 'csv') {
        const csv = AttendanceExportService.generateSummaryCsv(report);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="monthly-attendance-summary-${month}.csv"`
        );
        res.status(200).send(csv);
        return;
      } else if (format === 'pdf') {
        const pdf = AttendanceExportService.generateSummaryPdf(report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="monthly-attendance-summary-${month}.pdf"`
        );
        res.status(200).send(pdf);
        return;
      } else {
        const excel = await AttendanceExportService.generateSummaryExcel(report);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="monthly-attendance-summary-${month}.xlsx"`
        );
        res.status(200).send(excel);
        return;
      }
    }
  } catch (error: any) {
    console.error('exportAttendanceReport error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Export failed',
      code: 'EXPORT_FAILED',
    });
  }
};

