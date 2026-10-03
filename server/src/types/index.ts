export type UserRole = 'employee' | 'team_lead' | 'manager' | 'admin';

export type LeadType = 'online' | 'offline';

export type LeadStatus =
  | 'New'
  | 'Interested'
  | 'Follow Up'
  | 'Not Interested'
  | 'Admission Done'
  | 'Wrong Number';

export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: UserRole;
  team: string | null;
  phone: string | null;
  is_active: boolean;
  must_change_password?: boolean;
  password_reset_at?: string | null;
  password_reset_by?: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_team?: string;
  report_date: string;
  lead_name: string;
  mobile: string;
  lead_type: LeadType;
  course: string;
  status: LeadStatus;
  follow_up_date: string | null;
  follow_up_time?: string | null;
  is_notified?: boolean;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyReport {
  id: string;
  employee_id: string;
  report_date: string;
  lead_count: number;
  submitted_at: string;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  employee_id: string;
  employee_name?: string;
  lead_name?: string;
  lead_mobile?: string;
  follow_up_date: string;
  follow_up_time?: string | null;
  is_notified?: boolean;
  status: string;
  note: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type?: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  username: string;
  must_change_password?: boolean;
}

export interface AuditLog {
  id: string;
  target_user_id: string;
  target_user_name?: string;
  performed_by: string;
  performed_by_name?: string;
  action: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  created_at: string;
}

