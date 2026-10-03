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
  status: string;
  note: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  username: string;
}
