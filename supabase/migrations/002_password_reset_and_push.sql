-- Supabase Migration: 002_password_reset_and_push.sql
-- Parul LeadDesk: Manager-Initiated Password Reset & Web Push Follow-up Notifications

-- 1. EXTEND PROFILES TABLE FOR FORCED PASSWORD CHANGE
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_reset_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_reset_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_must_change_pw ON public.profiles(must_change_password);

-- 2. CREATE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (get_user_role() IN ('manager', 'admin'));

CREATE POLICY "Authenticated users or system can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() = performed_by OR get_user_role() IN ('manager', 'admin'));

-- 3. EXTEND LEADS & FOLLOW_UPS WITH TIME & NOTIFICATION STATUS
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS follow_up_time TIME,
ADD COLUMN IF NOT EXISTS is_notified BOOLEAN DEFAULT FALSE;

ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS follow_up_time TIME,
ADD COLUMN IF NOT EXISTS is_notified BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_leads_follow_up_schedule 
ON public.leads(follow_up_date, follow_up_time, is_notified);

CREATE INDEX IF NOT EXISTS idx_follow_ups_schedule 
ON public.follow_ups(follow_up_date, follow_up_time, is_notified);

-- 4. CREATE PUSH SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);

-- RLS for push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
