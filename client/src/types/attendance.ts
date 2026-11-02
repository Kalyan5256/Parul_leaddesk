export type DeviceStatus = 'pending' | 'approved' | 'revoked';

export interface EmployeeDevice {
  id: string;
  employee_id: string;
  employee_name?: string;
  device_name: string;
  device_fingerprint: string | null;
  public_key: string;
  key_algorithm: string;
  status: DeviceStatus;
  registered_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
  revoked_by_name?: string | null;
  revocation_reason?: string | null;
  last_used_at?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type AttendanceStatus = 'present' | 'half_day' | 'absent' | 'leave';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  attendance_date: string; // YYYY-MM-DD in Asia/Kolkata
  device_id: string | null;
  device_name?: string;
  check_in_time: string;
  check_out_time: string | null;
  total_minutes: number;
  status: AttendanceStatus;
  is_corrected: boolean;
  correction_reason?: string | null;
  corrected_by?: string | null;
  corrected_by_name?: string | null;
  corrected_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceAuditLog {
  id: string;
  attendance_id: string | null;
  employee_id: string;
  employee_name?: string;
  performed_by: string;
  performed_by_name?: string;
  action: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  reason?: string | null;
  created_at: string;
}

export interface MonthlyEmployeeSummary {
  employee_id: string;
  employee_name: string;
  email: string;
  total_calendar_days: number;
  working_days: number;
  present_days: number;
  half_days: number;
  payable_days: number;
  absent_days: number;
  approved_leaves: number;
  total_working_minutes: number;
  total_working_hours: string;
  avg_working_hours: string;
  missing_checkouts: number;
  attendance_percentage: number;
}

export interface MonthlyAttendanceReport {
  month: string;
  total_calendar_days: number;
  working_days: number;
  total_employees: number;
  summaries: MonthlyEmployeeSummary[];
  generated_at: string;
}
