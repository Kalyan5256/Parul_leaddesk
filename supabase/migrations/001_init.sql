-- Supabase Migration: 001_init.sql
-- Parul LeadDesk Admission System Schema with RLS and Indexes

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('employee', 'team_lead', 'manager', 'admin')),
  team TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  lead_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  lead_type TEXT NOT NULL CHECK (lead_type IN ('online', 'offline')),
  course TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('New', 'Interested', 'Follow Up', 'Not Interested', 'Admission Done', 'Wrong Number')),
  follow_up_date DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_employee_id ON public.leads(employee_id);
CREATE INDEX IF NOT EXISTS idx_leads_report_date ON public.leads(report_date);
CREATE INDEX IF NOT EXISTS idx_leads_mobile ON public.leads(mobile);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON public.leads(follow_up_date);

-- 3. DAILY REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  lead_count INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_employee_report_date UNIQUE (employee_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_employee_date ON public.daily_reports(employee_id, report_date);

-- 4. FOLLOW-UPS TABLE
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  follow_up_date DATE NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON public.follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_employee_id ON public.follow_ups(employee_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON public.follow_ups(follow_up_date);

-- 5. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);

-- Trigger to update updated_at on leads
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

-- ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper to check user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper to check user team
CREATE OR REPLACE FUNCTION get_user_team()
RETURNS TEXT AS $$
  SELECT team FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile or managers/admins can view all"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id 
  OR get_user_role() IN ('manager', 'admin')
  OR (get_user_role() = 'team_lead' AND team = get_user_team())
);

CREATE POLICY "Managers and Admins can update profiles"
ON public.profiles FOR UPDATE
USING (get_user_role() IN ('manager', 'admin'))
WITH CHECK (get_user_role() IN ('manager', 'admin'));

-- LEADS POLICIES
CREATE POLICY "Leads SELECT Policy"
ON public.leads FOR SELECT
USING (
  -- Employee: only own leads
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  -- Team Lead: team leads
  OR (get_user_role() = 'team_lead' AND employee_id IN (
      SELECT id FROM public.profiles WHERE team = get_user_team()
  ))
  -- Manager / Admin: all leads
  OR (get_user_role() IN ('manager', 'admin'))
);

CREATE POLICY "Leads INSERT Policy"
ON public.leads FOR INSERT
WITH CHECK (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

CREATE POLICY "Leads UPDATE Policy"
ON public.leads FOR UPDATE
USING (
  (get_user_role() = 'employee' AND employee_id = auth.uid() AND created_at >= NOW() - INTERVAL '24 HOURS')
  OR (get_user_role() = 'team_lead' AND employee_id IN (
      SELECT id FROM public.profiles WHERE team = get_user_team()
  ))
  OR (get_user_role() IN ('manager', 'admin'))
);

-- DAILY REPORTS POLICIES
CREATE POLICY "Daily Reports SELECT Policy"
ON public.daily_reports FOR SELECT
USING (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() = 'team_lead' AND employee_id IN (
      SELECT id FROM public.profiles WHERE team = get_user_team()
  ))
  OR (get_user_role() IN ('manager', 'admin'))
);

CREATE POLICY "Daily Reports INSERT/UPDATE Policy"
ON public.daily_reports FOR ALL
USING (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

-- FOLLOW UPS POLICIES
CREATE POLICY "Follow Ups SELECT Policy"
ON public.follow_ups FOR SELECT
USING (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() = 'team_lead' AND employee_id IN (
      SELECT id FROM public.profiles WHERE team = get_user_team()
  ))
  OR (get_user_role() IN ('manager', 'admin'))
);

CREATE POLICY "Follow Ups INSERT Policy"
ON public.follow_ups FOR INSERT
WITH CHECK (
  (get_user_role() = 'employee' AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

-- NOTIFICATIONS POLICIES
CREATE POLICY "Notifications Access Policy"
ON public.notifications FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
