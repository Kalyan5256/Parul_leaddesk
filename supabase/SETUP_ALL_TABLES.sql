-- ==============================================================================
-- PARUL LEADDESK — COMPLETE SUPABASE DATABASE SETUP & FRESH RESET
-- ==============================================================================
-- Run this script in your Supabase Dashboard > SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
--
-- This script sets up all tables, relations, triggers, indexes, and RLS policies.
-- It leaves the database 100% clean and ready for manual testing.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP EXISTING TABLES (IF RESETTING)
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.follow_ups CASCADE;
DROP TABLE IF EXISTS public.daily_reports CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. CREATE PROFILES TABLE (Linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('employee', 'team_lead', 'manager', 'admin')),
  team TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  must_change_password BOOLEAN DEFAULT FALSE,
  password_reset_at TIMESTAMPTZ,
  password_reset_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_team ON public.profiles(team);
CREATE INDEX idx_profiles_must_change_pw ON public.profiles(must_change_password);

-- 3. CREATE LEADS TABLE
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  lead_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  lead_type TEXT NOT NULL CHECK (lead_type IN ('online', 'offline')),
  course TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('New', 'Interested', 'Follow Up', 'Not Interested', 'Admission Done', 'Wrong Number')),
  follow_up_date DATE,
  follow_up_time TIME,
  is_notified BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_employee_id ON public.leads(employee_id);
CREATE INDEX idx_leads_report_date ON public.leads(report_date);
CREATE INDEX idx_leads_mobile ON public.leads(mobile);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_follow_up_date ON public.leads(follow_up_date);
CREATE INDEX idx_leads_follow_up_schedule ON public.leads(follow_up_date, follow_up_time, is_notified);

-- 4. CREATE DAILY REPORTS TABLE
CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  lead_count INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_employee_report_date UNIQUE (employee_id, report_date)
);

CREATE INDEX idx_daily_reports_employee_date ON public.daily_reports(employee_id, report_date);

-- 5. CREATE FOLLOW-UPS TABLE
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  follow_up_date DATE NOT NULL,
  follow_up_time TIME,
  is_notified BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_follow_ups_lead_id ON public.follow_ups(lead_id);
CREATE INDEX idx_follow_ups_employee_id ON public.follow_ups(employee_id);
CREATE INDEX idx_follow_ups_schedule ON public.follow_ups(follow_up_date, follow_up_time, is_notified);

-- 6. CREATE NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);

-- 7. CREATE AUDIT LOGS TABLE
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_target ON public.audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(performed_by);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);

-- 8. CREATE PUSH SUBSCRIPTIONS TABLE
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_subs_user_id ON public.push_subscriptions(user_id);

-- 9. TRIGGER TO UPDATE updated_at ON LEADS
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON public.leads;
CREATE TRIGGER trigger_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 10. ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_team()
RETURNS TEXT AS $$
  SELECT team FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 11. ENABLE RLS ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 12. RLS POLICIES
-- Profiles Policies
CREATE POLICY "Profiles SELECT" ON public.profiles FOR SELECT
USING (
  auth.uid() = id 
  OR get_user_role() IN ('manager', 'admin')
  OR (get_user_role() = 'team_lead' AND team = get_user_team())
);

CREATE POLICY "Profiles UPDATE" ON public.profiles FOR UPDATE
USING (get_user_role() IN ('manager', 'admin'))
WITH CHECK (get_user_role() IN ('manager', 'admin'));

-- Leads Policies
CREATE POLICY "Leads SELECT" ON public.leads FOR SELECT
USING (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() = 'team_lead' AND employee_id IN (
      SELECT id FROM public.profiles WHERE team = get_user_team()
  ))
  OR (get_user_role() IN ('manager', 'admin'))
);

CREATE POLICY "Leads INSERT" ON public.leads FOR INSERT
WITH CHECK (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

CREATE POLICY "Leads UPDATE" ON public.leads FOR UPDATE
USING (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

-- Daily Reports Policies
CREATE POLICY "Daily Reports SELECT" ON public.daily_reports FOR SELECT
USING (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() = 'team_lead' AND employee_id IN (
      SELECT id FROM public.profiles WHERE team = get_user_team()
  ))
  OR (get_user_role() IN ('manager', 'admin'))
);

CREATE POLICY "Daily Reports INSERT" ON public.daily_reports FOR INSERT
WITH CHECK (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

-- Follow-ups Policies
CREATE POLICY "Follow-ups SELECT" ON public.follow_ups FOR SELECT
USING (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() = 'team_lead' AND employee_id IN (
      SELECT id FROM public.profiles WHERE team = get_user_team()
  ))
  OR (get_user_role() IN ('manager', 'admin'))
);

CREATE POLICY "Follow-ups INSERT" ON public.follow_ups FOR INSERT
WITH CHECK (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

CREATE POLICY "Follow-ups UPDATE" ON public.follow_ups FOR UPDATE
USING (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

-- Notifications Policies
CREATE POLICY "Notifications ALL" ON public.notifications FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Audit Logs Policies
CREATE POLICY "Audit Logs SELECT" ON public.audit_logs FOR SELECT
USING (get_user_role() IN ('manager', 'admin'));

CREATE POLICY "Audit Logs INSERT" ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() = performed_by OR get_user_role() IN ('manager', 'admin'));

-- Push Subscriptions Policies
CREATE POLICY "Push Subscriptions ALL" ON public.push_subscriptions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- DONE! All tables are fresh and empty (0 leads, 0 reports, 0 follow-ups).
-- ==============================================================================
