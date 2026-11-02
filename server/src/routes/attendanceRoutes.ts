import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { restrictMobileAttendance } from '../utils/cryptoVerification.js';
import {
  requestAttendanceChallenge,
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendanceHistory,
  registerOfficeDevice,
  getMyRegisteredDevices,
  getAdminDailyAttendance,
  getAdminMissingCheckouts,
  getAdminEmployeeHistory,
  correctAttendanceRecord,
  getAdminDevices,
  approveDevice,
  revokeDevice,
  getAdminAuditLogs,
  getAdminMonthlyReport,
  exportAttendanceReport,
} from '../controllers/attendanceController.js';

const router = Router();

// ============================================================================
// GLOBAL ROLE ENFORCEMENT & STRICT EXCLUSION
// ============================================================================
// Explicitly block team_lead role from attendance operations
router.use(authenticate, (req: any, res, next) => {
  const role = req.profile?.role;
  if (role === 'team_lead') {
    res.status(403).json({
      success: false,
      message: `Forbidden: The Attendance module is not accessible to team leads.`,
      code: 'ATTENDANCE_ROLE_FORBIDDEN',
    });
    return;
  }
  next();
});

// ============================================================================
// PERSONAL ATTENDANCE ROUTES (Employee & Manager - Desktop Only)
// ============================================================================

// Issue single-use challenge nonce for cryptographic signature
router.post(
  '/challenge',
  requireRole('employee', 'manager'),
  restrictMobileAttendance,
  requestAttendanceChallenge
);

// Check-in (WebCrypto ECDSA signature verification)
router.post(
  '/check-in',
  requireRole('employee', 'manager'),
  restrictMobileAttendance,
  checkIn
);

// Check-out (WebCrypto ECDSA signature verification)
router.post(
  '/check-out',
  requireRole('employee', 'manager'),
  restrictMobileAttendance,
  checkOut
);

// View today's personal attendance status
router.get(
  '/today',
  requireRole('employee', 'manager'),
  getTodayAttendance
);

// View monthly personal attendance history
router.get(
  '/my-history',
  requireRole('employee', 'manager'),
  getMyAttendanceHistory
);

// Register office laptop (creates pending device record)
router.post(
  '/devices/register',
  requireRole('employee', 'manager'),
  restrictMobileAttendance,
  registerOfficeDevice
);

// List personal registered devices
router.get(
  '/devices/my',
  requireRole('employee', 'manager'),
  getMyRegisteredDevices
);

// ============================================================================
// ATTENDANCE MANAGEMENT & EXPORT ROUTES (Manager & Administrator)
// ============================================================================

// Daily attendance overview
router.get(
  '/admin/daily',
  requireRole('manager', 'admin'),
  getAdminDailyAttendance
);

// Missing checkouts list
router.get(
  '/admin/missing-checkouts',
  requireRole('manager', 'admin'),
  getAdminMissingCheckouts
);

// Individual employee attendance records
router.get(
  '/admin/employee/:employeeId',
  requireRole('manager', 'admin'),
  getAdminEmployeeHistory
);

// Administrative record correction (mandatory reason)
router.post(
  '/admin/correct',
  requireRole('manager', 'admin'),
  correctAttendanceRecord
);

// List registered employee devices
router.get(
  '/admin/devices',
  requireRole('manager', 'admin'),
  getAdminDevices
);

// Approve device registration
router.patch(
  '/admin/devices/:deviceId/approve',
  requireRole('manager', 'admin'),
  approveDevice
);

// Revoke device registration
router.patch(
  '/admin/devices/:deviceId/revoke',
  requireRole('manager', 'admin'),
  revokeDevice
);

// Audit logs
router.get(
  '/admin/audit-logs',
  requireRole('manager', 'admin'),
  getAdminAuditLogs
);

// Monthly attendance summary report
router.get(
  '/admin/monthly-report',
  requireRole('manager', 'admin'),
  getAdminMonthlyReport
);

// Export attendance in Excel (.xlsx), CSV (.csv), or PDF (.pdf)
router.get(
  '/admin/export',
  requireRole('manager', 'admin'),
  exportAttendanceReport
);

export default router;
