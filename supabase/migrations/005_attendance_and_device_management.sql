-- ==============================================================================
-- PARUL LEADDESK — EMPLOYEE ATTENDANCE & OFFICE LAPTOP DEVICE REGISTRATION
-- Migration: 005_attendance_and_device_management.sql
-- ==============================================================================
-- Non-destructive backward-compatible additive migration.
-- Preserves ALL historical leads, follow-ups, daily reports, profiles, and audit logs.
-- ==============================================================================

-- 1. CREATE EMPLOYEE_DEVICES TABLE
-- Stores registered office laptops associated with employees.
-- Device registration requires explicit administrator approval before attendance is permitted.
CREATE TABLE IF NOT EXISTS public.employee_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_fingerprint TEXT,
  public_key TEXT NOT NULL,
  key_algorithm TEXT NOT NULL DEFAULT 'ECDSA-P256',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revoked')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  revocation_reason TEXT,
  last_used_at TIMESTAMPTZ,
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_devices_employee_id ON public.employee_devices(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_devices_status ON public.employee_devices(status);
CREATE INDEX IF NOT EXISTS idx_employee_devices_fingerprint ON public.employee_devices(device_fingerprint);

-- 2. CREATE ATTENDANCE_RECORDS TABLE
-- Stores daily check-in and check-out records.
-- Enforces strictly one record per employee per working day in Asia/Kolkata timezone.
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  device_id UUID REFERENCES public.employee_devices(id) ON DELETE SET NULL,
  check_in_time TIMESTAMPTZ NOT NULL,
  check_out_time TIMESTAMPTZ,
  total_minutes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'half_day', 'absent', 'leave')),
  is_corrected BOOLEAN DEFAULT FALSE,
  correction_reason TEXT,
  corrected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  corrected_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_employee_attendance_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_id ON public.attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date ON public.attendance_records(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);

-- 3. CREATE ATTENDANCE_AUDIT_LOGS TABLE
-- Tracks all administrative corrections, approvals, and revocations for audit compliance.
CREATE TABLE IF NOT EXISTS public.attendance_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID REFERENCES public.attendance_records(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_values JSONB DEFAULT '{}'::jsonb,
  new_values JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_att_audit_logs_employee ON public.attendance_audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_audit_logs_actor ON public.attendance_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_att_audit_logs_action ON public.attendance_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_att_audit_logs_created ON public.attendance_audit_logs(created_at);

-- 4. CREATE ATTENDANCE_CHALLENGES TABLE
-- Stores short-lived cryptographic nonces for registered device authentication.
CREATE TABLE IF NOT EXISTS public.attendance_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.employee_devices(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_att_challenges_nonce ON public.attendance_challenges(nonce);
CREATE INDEX IF NOT EXISTS idx_att_challenges_employee ON public.attendance_challenges(employee_id);

-- 5. TRIGGERS TO UPDATE updated_at
DROP TRIGGER IF EXISTS trigger_employee_devices_updated_at ON public.employee_devices;
CREATE TRIGGER trigger_employee_devices_updated_at
BEFORE UPDATE ON public.employee_devices
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS trigger_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER trigger_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.employee_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_challenges ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR EMPLOYEE_DEVICES
DROP POLICY IF EXISTS "Employee Devices SELECT" ON public.employee_devices;
CREATE POLICY "Employee Devices SELECT" ON public.employee_devices FOR SELECT
USING (
  (get_user_role() IN ('employee', 'manager') AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

DROP POLICY IF EXISTS "Employee Devices INSERT" ON public.employee_devices;
CREATE POLICY "Employee Devices INSERT" ON public.employee_devices FOR INSERT
WITH CHECK (
  (get_user_role() IN ('employee', 'manager') AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

DROP POLICY IF EXISTS "Employee Devices UPDATE" ON public.employee_devices;
CREATE POLICY "Employee Devices UPDATE" ON public.employee_devices FOR UPDATE
USING (get_user_role() IN ('manager', 'admin'))
WITH CHECK (get_user_role() IN ('manager', 'admin'));

-- 8. RLS POLICIES FOR ATTENDANCE_RECORDS
DROP POLICY IF EXISTS "Attendance Records SELECT" ON public.attendance_records;
CREATE POLICY "Attendance Records SELECT" ON public.attendance_records FOR SELECT
USING (
  (get_user_role() IN ('employee', 'manager') AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

DROP POLICY IF EXISTS "Attendance Records INSERT" ON public.attendance_records;
CREATE POLICY "Attendance Records INSERT" ON public.attendance_records FOR INSERT
WITH CHECK (
  (get_user_role() IN ('employee', 'manager') AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

DROP POLICY IF EXISTS "Attendance Records UPDATE" ON public.attendance_records;
CREATE POLICY "Attendance Records UPDATE" ON public.attendance_records FOR UPDATE
USING (
  (get_user_role() IN ('employee', 'manager') AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

-- 9. RLS POLICIES FOR ATTENDANCE_AUDIT_LOGS
DROP POLICY IF EXISTS "Attendance Audit Logs SELECT" ON public.attendance_audit_logs;
CREATE POLICY "Attendance Audit Logs SELECT" ON public.attendance_audit_logs FOR SELECT
USING (
  (get_user_role() IN ('employee', 'manager') AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

DROP POLICY IF EXISTS "Attendance Audit Logs INSERT" ON public.attendance_audit_logs;
CREATE POLICY "Attendance Audit Logs INSERT" ON public.attendance_audit_logs FOR INSERT
WITH CHECK (
  (get_user_role() IN ('employee', 'manager') AND employee_id = auth.uid())
  OR (get_user_role() IN ('manager', 'admin'))
);

-- 10. RLS POLICIES FOR ATTENDANCE_CHALLENGES
DROP POLICY IF EXISTS "Attendance Challenges ALL" ON public.attendance_challenges;
CREATE POLICY "Attendance Challenges ALL" ON public.attendance_challenges FOR ALL
USING (
  employee_id = auth.uid() OR get_user_role() IN ('manager', 'admin')
)
WITH CHECK (
  employee_id = auth.uid() OR get_user_role() IN ('manager', 'admin')
);

