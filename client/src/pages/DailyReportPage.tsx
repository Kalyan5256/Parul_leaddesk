import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { GlassModal } from '../components/ui/Modal';
import confetti from 'canvas-confetti';
import {
  FilePlus2,
  Calendar,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Info,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { sanitizeMobile, indianMobileRegex } from '../lib/validation';

interface LeadFormRow {
  id: string;
  lead_name: string;
  mobile: string;
  lead_type: 'online' | 'offline';
  course: string;
  status: 'New' | 'Interested' | 'Follow Up' | 'Not Interested' | 'Admission Done' | 'Wrong Number';
  follow_up_date: string;
  follow_up_time?: string;
  remarks: string;
  error?: Record<string, string>;
  isDuplicate?: boolean;
}

const COMMON_COURSES = [
  'Diploma in Blockchain Technology',
  'Diploma in Business Analytics',
  'Diploma in Digital Marketing',
  'Diploma in Financial Services & Portfolio Management',
  'PG Diploma in Industrial Relations & Personnel Management',
  'Bachelor of Arts (General)',
  'Bachelor of Business Administration',
  'Bachelor of Computer Applications',
  'Master of Business Administration',
  'Master of Computer Applications',
  'Master of Arts (Journalism and Mass Communication)',
  'Master of Arts (English Language Teaching)',
  'Master of Commerce',
  'Master of Social Work',
  'Master of Science (Applied Mathematics)',
  'offline-regular'
];

const STATUS_OPTIONS = [
  { value: 'New', label: 'New Lead' },
  { value: 'Interested', label: 'Interested' },
  { value: 'Follow Up', label: 'Follow Up' },
  { value: 'Admission Done', label: 'Admission Done' },
  { value: 'Not Interested', label: 'Not Interested' },
  { value: 'Wrong Number', label: 'Wrong Number' },
];

const LEAD_TYPE_OPTIONS = [
  { value: 'online', label: 'Online Inquiry (Web/Social)' },
  { value: 'offline', label: 'Offline / Campus Walk-in' },
];

const getTodayString = () => new Date().toISOString().split('T')[0];

const getMinDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
};

export const DailyReportPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: showError, info: showInfo } = useToast();
  const navigate = useNavigate();

  // Step 1: Report Date
  const [reportDate, setReportDate] = useState<string>(getTodayString());
  // Step 2: Desired count input (1-60)
  const [leadCountInput, setLeadCountInput] = useState<number>(3);
  // Dynamic Lead cards
  const [leads, setLeads] = useState<LeadFormRow[]>([]);
  // Previous submission for same date notice
  const [sameDayNotice, setSameDayNotice] = useState<{
    alreadySubmitted: boolean;
    leadCount: number;
    submittedAt: string;
  } | null>(null);

  // Reducing count confirmation state (Section 21)
  const [reducingConfirmation, setReducingConfirmation] = useState<{
    isOpen: boolean;
    targetCount: number;
    excessCount: number;
  }>({ isOpen: false, targetCount: 0, excessCount: 0 });

  // Submission summary modal state (Section 24)
  const [submissionSummary, setSubmissionSummary] = useState<{
    isOpen: boolean;
    totalSubmitted: number;
    totalDayLeads: number;
    onlineCount: number;
    offlineCount: number;
    reportDate: string;
    wasAdditive: boolean;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredDraftRef = useRef(false);

  // Helper to create empty lead row
  const createEmptyRow = useCallback(
    (index: number): LeadFormRow => ({
      id: `row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      lead_name: '',
      mobile: '',
      lead_type: 'online',
      course: COMMON_COURSES[0],
      status: 'New',
      follow_up_date: '',
      follow_up_time: '',
      remarks: '',
      error: {},
      isDuplicate: false,
    }),
    []
  );

  // Check if employee already submitted today: Section 25
  const checkSameDaySubmission = useCallback(async (date: string) => {
    try {
      const res = await api.get('/reports/daily-summary', { date });
      if (res.success && res.data) {
        setSameDayNotice({
          alreadySubmitted: true,
          leadCount: res.data.lead_count,
          submittedAt: new Date(res.data.submitted_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      } else {
        setSameDayNotice(null);
      }
    } catch {
      setSameDayNotice(null);
    }
  }, []);

  useEffect(() => {
    checkSameDaySubmission(reportDate);
  }, [reportDate, checkSameDaySubmission]);

  // Initial setup & Autosave restoration (Section 23)
  useEffect(() => {
    if (hasRestoredDraftRef.current) return;
    hasRestoredDraftRef.current = true;

    const savedDraft = localStorage.getItem(`parul_report_draft_${user?.id}`);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.reportDate) setReportDate(parsed.reportDate);
        if (Array.isArray(parsed.leads) && parsed.leads.length > 0) {
          setLeads(parsed.leads);
          setLeadCountInput(parsed.leads.length);
          showInfo('Draft restored from your last session', 3000);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse autosaved draft');
      }
    }

    // Default to 3 initial cards
    const initialRows: LeadFormRow[] = [
      createEmptyRow(1),
      createEmptyRow(2),
      createEmptyRow(3),
    ];
    setLeads(initialRows);
    setLeadCountInput(3);
  }, [user?.id, createEmptyRow, showInfo]);

  // Autosave to localStorage on changes (Section 23)
  useEffect(() => {
    if (!user?.id || leads.length === 0) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      localStorage.setItem(
        `parul_report_draft_${user.id}`,
        JSON.stringify({
          reportDate,
          leads,
          savedAt: new Date().toISOString(),
        })
      );
    }, 1000);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [reportDate, leads, user?.id]);

  // Batch duplicate mobile number check (Section 20)
  const checkBatchDuplicates = useCallback(async (currentLeads: LeadFormRow[]) => {
    const validMobiles = currentLeads
      .map((l) => sanitizeMobile(l.mobile))
      .filter((m) => indianMobileRegex.test(m));

    if (validMobiles.length === 0) return;

    try {
      setIsDuplicateChecking(true);
      const res = await api.post('/leads/check-duplicate', { mobiles: validMobiles });
      if (res.success && Array.isArray(res.duplicates)) {
        const dupSet = new Set(res.duplicates);
        setLeads((prev) =>
          prev.map((l) => ({
            ...l,
            isDuplicate: dupSet.has(sanitizeMobile(l.mobile)),
          }))
        );
      }
    } catch {
      // Ignore background duplicate check network failure
    } finally {
      setIsDuplicateChecking(false);
    }
  }, []);

  // Handle lead count change (Section 17, 18, 21)
  const handleCountChange = (newCountStr: string) => {
    const count = parseInt(newCountStr, 10);
    if (isNaN(count)) return;

    // Bounds: 1 to 60
    const clampedCount = Math.max(1, Math.min(60, count));
    setLeadCountInput(clampedCount);

    if (clampedCount === leads.length) return;

    if (clampedCount > leads.length) {
      // Expanding rows
      const additional: LeadFormRow[] = [];
      for (let i = leads.length; i < clampedCount; i++) {
        additional.push(createEmptyRow(i + 1));
      }
      setLeads((prev) => [...prev, ...additional]);
    } else {
      // Reducing count: check if removing non-empty rows (Section 21)
      const excess = leads.slice(clampedCount);
      const hasEnteredData = excess.some(
        (l) => l.lead_name.trim() || l.mobile.trim() || l.remarks.trim()
      );

      if (hasEnteredData) {
        setReducingConfirmation({
          isOpen: true,
          targetCount: clampedCount,
          excessCount: leads.length - clampedCount,
        });
      } else {
        setLeads((prev) => prev.slice(0, clampedCount));
      }
    }
  };

  const confirmReduction = () => {
    setLeads((prev) => prev.slice(0, reducingConfirmation.targetCount));
    setReducingConfirmation({ isOpen: false, targetCount: 0, excessCount: 0 });
  };

  // Add one more lead dynamically (Section 22)
  const handleAddOneMore = () => {
    if (leads.length >= 60) {
      showError('Maximum 60 leads permitted per daily report');
      return;
    }
    const newRow = createEmptyRow(leads.length + 1);
    setLeads((prev) => [...prev, newRow]);
    setLeadCountInput(leads.length + 1);
  };

  // Remove individual row
  const handleRemoveRow = (id: string) => {
    if (leads.length <= 1) {
      showError('At least 1 lead row must remain');
      return;
    }
    const filtered = leads.filter((l) => l.id !== id);
    setLeads(filtered);
    setLeadCountInput(filtered.length);
  };

  // Update specific row field
  const handleFieldChange = (
    id: string,
    field: keyof LeadFormRow,
    value: any
  ) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== id) return lead;

        const updated = { ...lead, [field]: value };

        // Real-time mobile sanitation (Section 19)
        if (field === 'mobile') {
          const cleaned = sanitizeMobile(value);
          updated.mobile = cleaned;
          if (cleaned.length === 10) {
            if (!indianMobileRegex.test(cleaned)) {
              updated.error = {
                ...updated.error,
                mobile: 'Indian mobile numbers must start with 6, 7, 8, or 9',
              };
            } else {
              const { mobile: _, ...remainingErrors } = updated.error || {};
              updated.error = remainingErrors;
              // Trigger duplicate check debounced
              checkBatchDuplicates([...leads.filter((l) => l.id !== id), updated]);
            }
          } else if (cleaned.length > 0 && cleaned.length < 10) {
            updated.error = {
              ...updated.error,
              mobile: `${10 - cleaned.length} more digits needed`,
            };
          } else {
            const { mobile: _, ...remainingErrors } = updated.error || {};
            updated.error = remainingErrors;
          }
        }

        // Auto follow-up date and time validation
        if (field === 'status') {
          if (value === 'Follow Up') {
            if (!updated.follow_up_date) {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              updated.follow_up_date = tomorrow.toISOString().split('T')[0];
            }
            if (!updated.follow_up_time) {
              updated.follow_up_time = '10:00';
            }
          }
        }

        return updated;
      })
    );
  };

  // Validation before submission (Section 24)
  const validateAllRows = (): boolean => {
    let isValid = true;
    const updated = leads.map((lead, idx) => {
      const errors: Record<string, string> = {};

      if (!lead.lead_name || lead.lead_name.trim().length < 2) {
        errors.lead_name = 'Student full name is required (min 2 chars)';
        isValid = false;
      }

      const cleanMob = sanitizeMobile(lead.mobile);
      if (!cleanMob) {
        errors.mobile = '10-digit Indian mobile number is required';
        isValid = false;
      } else if (!indianMobileRegex.test(cleanMob)) {
        errors.mobile = 'Must be exactly 10 digits starting with 6, 7, 8, or 9';
        isValid = false;
      }

      if (!lead.course) {
        errors.course = 'Please select academic program';
        isValid = false;
      }

      if (lead.status === 'Follow Up' && !lead.follow_up_date) {
        errors.follow_up_date = 'Follow-up date required for "Follow Up" status';
        isValid = false;
      }

      if (lead.follow_up_date && lead.follow_up_date < reportDate) {
        errors.follow_up_date = 'Follow-up date cannot be earlier than report date';
        isValid = false;
      }

      return { ...lead, error: errors };
    });

    setLeads(updated);
    return isValid;
  };

  // Submit Daily Report (Section 24, 25)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllRows()) {
      showError('Please resolve inline validation errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadLeads = leads.map((l) => ({
        lead_name: l.lead_name.trim(),
        mobile: sanitizeMobile(l.mobile),
        lead_type: l.lead_type,
        course: l.course,
        status: l.status,
        follow_up_date: l.follow_up_date || null,
        follow_up_time: l.follow_up_time || null,
        remarks: l.remarks?.trim() || null,
      }));

      const res = await api.post('/leads/bulk', {
        report_date: reportDate,
        leads: payloadLeads,
      });

      if (!res.success) {
        throw new Error(res.message || 'Submission failed');
      }

      // Trigger Celebration Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F5A800', '#C8102E', '#FFFFFF', '#0B2A5B'],
      });

      // Clear draft for this user
      localStorage.removeItem(`parul_report_draft_${user?.id}`);

      // Open Summary Modal (Section 24)
      setSubmissionSummary({
        isOpen: true,
        totalSubmitted: res.summary.totalSubmittedThisBatch,
        totalDayLeads: res.summary.totalDayLeads,
        onlineCount: res.summary.onlineCount,
        offlineCount: res.summary.offlineCount,
        reportDate: res.summary.reportDate,
        wasAdditive: res.summary.wasAdditive,
      });

      success(`${res.summary.totalSubmittedThisBatch} leads logged successfully!`);
    } catch (err: any) {
      showError(err.message || 'Unable to submit daily lead report. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormForAnother = () => {
    setSubmissionSummary(null);
    const initialRows: LeadFormRow[] = [
      createEmptyRow(1),
      createEmptyRow(2),
      createEmptyRow(3),
    ];
    setLeads(initialRows);
    setLeadCountInput(3);
    checkSameDaySubmission(reportDate);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <FilePlus2 className="w-6 h-6 text-pu-gold" />
              <span>Daily Lead Reporting Desk</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pu-gold/20 text-pu-gold border border-pu-gold/30">
              Core Desk
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Submit your student inquiries. Additive tracking ensures second submissions on the same date will append seamlessly.
          </p>
        </div>

        {/* Quick Draft Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.removeItem(`parul_report_draft_${user?.id}`);
              resetFormForAnother();
              showInfo('Form reset to blank state');
            }}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Form
          </Button>
        </div>
      </div>

      {/* Same-day Second Submission Notice (Section 25) */}
      {sameDayNotice?.alreadySubmitted && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-3 text-amber-200 animate-in fade-in duration-200">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold text-white">Same-Day Reporting Notice: </span>
            You already submitted{' '}
            <strong className="text-pu-gold underline">
              {sameDayNotice.leadCount} leads
            </strong>{' '}
            for {reportDate} at {sameDayNotice.submittedAt}.
            <span className="block mt-1 text-slate-300">
              Submitting now will <strong className="text-white">ADD</strong> to today's count without overwriting prior records.
            </span>
          </div>
        </div>
      )}

      {/* Step 1 & 2 Config Header Card */}
      <GlassCard variant="default" padding="lg">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          {/* Step 1: Report Date (Cannot be future, max 7 days past) */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-pu-gold" />
              <span>Step 1: Report Date</span>
            </label>
            <Input
              type="date"
              value={reportDate}
              min={getMinDateString()}
              max={getTodayString()}
              onChange={(e) => setReportDate(e.target.value)}
              helperText="Cannot select future date; max 7 days past allowed"
              required
            />
          </div>

          {/* Step 2: Desired Lead Count (1-60) */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-pu-gold" />
                <span>Step 2: How many leads did you generate?</span>
              </span>
              <span className="text-pu-gold font-bold text-sm">
                {leads.length} Active Cards
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={60}
                value={leadCountInput}
                onChange={(e) => handleCountChange(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-base font-bold glass-input text-white focus:outline-none"
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleAddOneMore}
                leftIcon={<Plus className="w-4 h-4" />}
                className="shrink-0"
              >
                + Add One
              </Button>
            </div>
            <p className="text-xs text-slate-400">
              Allowed: 1–60 leads per submission batch
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Dynamic Lead Cards Grid (Section 18) */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {leads.map((lead, index) => {
            const rowNumber = index + 1;
            return (
              <GlassCard
                key={lead.id}
                variant="default"
                padding="md"
                className={`transition-all duration-200 border ${
                  Object.keys(lead.error || {}).length > 0
                    ? 'border-pu-red/70 shadow-lg shadow-red-500/10'
                    : 'border-white/15'
                }`}
              >
                {/* Lead Card Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-pu-gold to-amber-600 text-pu-navy font-black text-xs flex items-center justify-center shadow-md">
                      #{rowNumber}
                    </span>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Lead Entry {rowNumber}
                    </h3>

                    {/* Duplicate Warning Badge (Section 20) */}
                    {lead.isDuplicate && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-400/30 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-orange-400" />
                        <span>Possible Duplicate Lead</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="type" value={lead.lead_type} size="sm">
                      {lead.lead_type}
                    </Badge>
                    {leads.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(lead.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remove this lead row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lead Form Fields (Sections 18, 19) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Lead Name */}
                  <Input
                    label="Candidate / Student Name"
                    placeholder="e.g. Rahul Sharma"
                    value={lead.lead_name}
                    onChange={(e) =>
                      handleFieldChange(lead.id, 'lead_name', e.target.value)
                    }
                    error={lead.error?.lead_name}
                    required
                  />

                  {/* Mobile Number (with automatic +91 stripping and Indian 10-digit check) */}
                  <Input
                    label="10-Digit Mobile Number"
                    placeholder="9876543210 (spaces/hyphens stripped)"
                    value={lead.mobile}
                    onChange={(e) =>
                      handleFieldChange(lead.id, 'mobile', e.target.value)
                    }
                    error={lead.error?.mobile}
                    helperText={
                      lead.mobile.length === 10 && !lead.error?.mobile
                        ? '✓ Valid 10-digit Indian mobile'
                        : undefined
                    }
                    required
                  />

                  {/* Lead Type (Online vs Offline) */}
                  <Select
                    label="Channel Type"
                    value={lead.lead_type}
                    onChange={(e) =>
                      handleFieldChange(lead.id, 'lead_type', e.target.value)
                    }
                    options={LEAD_TYPE_OPTIONS}
                  />

                  {/* Academic Program / Course */}
                  <div className="space-y-1.5">
                    <Select
                      label="Enquired Course"
                      value={lead.course}
                      onChange={(e) =>
                        handleFieldChange(lead.id, 'course', e.target.value)
                      }
                      options={COMMON_COURSES.map((c) => ({
                        value: c,
                        label: c,
                      }))}
                      error={lead.error?.course}
                    />
                  </div>

                  {/* Counselling Status */}
                  <Select
                    label="Counselling Status"
                    value={lead.status}
                    onChange={(e) =>
                      handleFieldChange(lead.id, 'status', e.target.value)
                    }
                    options={STATUS_OPTIONS}
                  />

                  {/* Next Follow-up Date */}
                  <Input
                    label="Next Follow-up Date"
                    type="date"
                    min={reportDate}
                    value={lead.follow_up_date}
                    onChange={(e) =>
                      handleFieldChange(lead.id, 'follow_up_date', e.target.value)
                    }
                    error={lead.error?.follow_up_date}
                    helperText={
                      lead.status === 'Follow Up'
                        ? 'Required for follow-up queue'
                        : 'Optional for other statuses'
                    }
                  />

                  {/* Next Follow-up Time (IST) */}
                  <Input
                    label="Follow-up Time (IST)"
                    type="time"
                    value={lead.follow_up_time || ''}
                    onChange={(e) =>
                      handleFieldChange(lead.id, 'follow_up_time', e.target.value)
                    }
                    helperText={
                      lead.status === 'Follow Up'
                        ? 'Trigger push alert at this time'
                        : 'Optional time'
                    }
                  />

                  {/* Counselling Remarks / Notes (Full width on lg) */}
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Counselling Remarks & Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Candidate query, fee discussion, preferred hostel, scholarship details..."
                      value={lead.remarks}
                      onChange={(e) =>
                        handleFieldChange(lead.id, 'remarks', e.target.value)
                      }
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input text-white focus:outline-none"
                    />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Dynamic Add One More Lead Button (Section 22) */}
        <div className="flex items-center justify-between p-4 rounded-2xl glass-subtle border border-white/10">
          <div className="text-xs text-slate-300">
            <span>Currently drafting </span>
            <strong className="text-pu-gold font-bold">{leads.length}</strong>
            <span> leads for submission</span>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleAddOneMore}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            + Add One More Lead
          </Button>
        </div>

        {/* Form Action Controls */}
        <div className="sticky bottom-16 md:bottom-6 z-20 p-4 rounded-2xl glass-dark border border-white/20 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-xs">
              <span className="text-white font-semibold block">
                Autosave Active
              </span>
              <span className="text-slate-400">
                Draft automatically preserved in your workstation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              leftIcon={<Send className="w-4 h-4" />}
              className="w-full sm:w-auto text-base font-bold shadow-xl shadow-amber-500/25 px-8"
            >
              Submit {leads.length} Daily Leads
            </Button>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog: Reducing Lead Count (Section 21) */}
      <ConfirmDialog
        isOpen={reducingConfirmation.isOpen}
        title="Reduce Number of Leads?"
        message={`You are reducing the number of leads from ${leads.length} to ${reducingConfirmation.targetCount}. Data entered in leads ${
          reducingConfirmation.targetCount + 1
        }–${leads.length} will be permanently removed. Continue?`}
        confirmText="Continue & Remove"
        cancelText="Cancel"
        variant="warning"
        onConfirm={confirmReduction}
        onClose={() => {
          setReducingConfirmation({ isOpen: false, targetCount: 0, excessCount: 0 });
          setLeadCountInput(leads.length);
        }}
      />

      {/* Submission Summary Modal (Section 24) */}
      {submissionSummary && (
        <GlassModal
          isOpen={submissionSummary.isOpen}
          onClose={() => setSubmissionSummary(null)}
          title="Daily Lead Report Submitted"
          size="md"
        >
          <div className="text-center py-3 space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-white tracking-tight">
                {submissionSummary.totalSubmitted} Leads Submitted!
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                For Date: <strong className="text-white">{submissionSummary.reportDate}</strong>
              </p>
            </div>

            {/* Split breakdown card */}
            <div className="p-4 rounded-xl glass-subtle border border-white/10 grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-400/20">
                <span className="text-xs text-cyan-300 block font-semibold">Online Channel</span>
                <span className="text-xl font-bold text-white mt-1 block">
                  {submissionSummary.onlineCount}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-400/20">
                <span className="text-xs text-amber-300 block font-semibold">Offline / Walk-in</span>
                <span className="text-xl font-bold text-white mt-1 block">
                  {submissionSummary.offlineCount}
                </span>
              </div>
            </div>

            {submissionSummary.wasAdditive && (
              <p className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                ✓ Additive update: Combined total for {submissionSummary.reportDate} is now{' '}
                <strong>{submissionSummary.totalDayLeads} leads</strong>.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={resetFormForAnother}
              >
                Submit Another Report
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setSubmissionSummary(null);
                  navigate('/my-leads');
                }}
              >
                View My Leads
              </Button>
            </div>
          </div>
        </GlassModal>
      )}
    </div>
  );
};
