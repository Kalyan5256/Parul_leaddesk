-- ==============================================================================
-- PARUL LEADDESK V2 — ACTIVE FOLLOW-UP & HISTORICAL STATE MIGRATION
-- ==============================================================================
-- Backward-compatible, non-destructive migration.
-- Preserves ALL historical rows. Zero DELETEs.
-- ==============================================================================

-- 1. Add tracking columns to follow_ups
ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Add performance index on active follow-ups per lead
CREATE INDEX IF NOT EXISTS idx_follow_ups_active_lead
ON public.follow_ups(lead_id, is_active);

-- 3. Controlled data classification (NON-DESTRUCTIVE):
-- Mark historical superseded follow-ups as inactive (completed)
UPDATE public.follow_ups fu
SET is_active = FALSE,
    completed_at = fu.created_at
WHERE fu.id NOT IN (
  SELECT DISTINCT ON (lead_id) id
  FROM public.follow_ups
  ORDER BY lead_id, created_at DESC, id DESC
);

-- Mark follow-ups for terminal leads (Not Interested, Admission Done, Wrong Number) as inactive
UPDATE public.follow_ups fu
SET is_active = FALSE,
    completed_at = COALESCE(fu.completed_at, NOW())
FROM public.leads l
WHERE fu.lead_id = l.id
  AND l.status IN ('Not Interested', 'Admission Done', 'Wrong Number')
  AND fu.is_active = TRUE;
