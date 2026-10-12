-- ==============================================================================
-- PARUL LEADDESK — EMPLOYEE SOFT DELETION & AUDIT ENHANCEMENT MIGRATION
-- ==============================================================================
-- Non-destructive backward-compatible migration.
-- Preserves ALL historical leads, follow-ups, daily reports, and audit logs.
-- ==============================================================================

-- 1. Add soft-delete fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Add index on is_deleted for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON public.profiles(is_deleted);

-- 3. Enhance audit_logs with indexes for faster security retrieval
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
