import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { GlassModal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useToast } from '../context/ToastContext';
import { LeadDetailDrawer } from '../components/leads/LeadDetailDrawer';
import {
  BarChart3,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarDays,
  Phone,
  MessageCircle,
  CalendarPlus,
  Filter,
} from 'lucide-react';

interface KanbanColumn {
  id: string;
  title: string;
  badgeColor: string;
  icon: any;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'OVERDUE',
    title: 'Overdue Queue',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: AlertTriangle,
  },
  {
    id: 'TODAY',
    title: "Today's Calls",
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Calendar,
  },
  {
    id: 'THIS_WEEK',
    title: 'This Week',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    icon: CalendarDays,
  },
  {
    id: 'LATER',
    title: 'Later / Future',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    icon: Clock,
  },
  {
    id: 'DONE',
    title: 'Converted / Done',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
  },
];

export const FollowUpCommandCentrePage: React.FC = () => {
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Reschedule state
  const [rescheduleItem, setRescheduleItem] = useState<{
    id: string;
    leadName: string;
    currentDate: string;
    currentStatus: string;
  } | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [newStatus, setNewStatus] = useState('Follow Up');
  const [newNote, setNewNote] = useState('');

  // Fetch all follow-ups
  const { data: followUps = [], isLoading, refetch } = useQuery({
    queryKey: ['command-centre-followups'],
    queryFn: async () => {
      const res = await api.get('/follow-ups', {
        group: 'ALL',
      });
      return res.data || [];
    },
  });

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const next7DaysDate = new Date(Date.now() + 7 * 86400000);
  const next7DaysStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(next7DaysDate);

  // Group into Kanban columns: Lead-Centric & Strict Column Exclusivity (ONE LEAD -> ONE CARD)
  const groupedData: Record<string, any[]> = {
    OVERDUE: [],
    TODAY: [],
    THIS_WEEK: [],
    LATER: [],
    DONE: [],
  };

  const processedLeadIds = new Set<string>();

  followUps.forEach((fu: any) => {
    // Ensure one card per lead across all columns
    if (!fu.lead_id || processedLeadIds.has(fu.lead_id)) {
      return;
    }
    processedLeadIds.add(fu.lead_id);

    // Prefer authoritative lead_status if available, otherwise fu.status
    const effectiveStatus = fu.lead_status || fu.status;

    // Strict priority hierarchy:
    // 1. Terminal / Closed state -> DONE
    if (
      ['Admission Done', 'Not Interested', 'Wrong Number'].includes(effectiveStatus) ||
      fu.status === 'Admission Done' ||
      fu.status === 'Not Interested' ||
      fu.status === 'Wrong Number'
    ) {
      groupedData.DONE.push(fu);
    } else if (fu.follow_up_date < todayStr) {
      groupedData.OVERDUE.push(fu);
    } else if (fu.follow_up_date === todayStr) {
      groupedData.TODAY.push(fu);
    } else if (fu.follow_up_date <= next7DaysStr) {
      groupedData.THIS_WEEK.push(fu);
    } else {
      groupedData.LATER.push(fu);
    }
  });

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: () =>
      api.patch(`/follow-ups/${rescheduleItem?.id}`, {
        follow_up_date: newDate,
        follow_up_time: newTime || null,
        status: newStatus,
        note: newNote,
      }),
    onSuccess: () => {
      success('Candidate follow-up rescheduled successfully');
      setRescheduleItem(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['command-centre-followups'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
    onError: (err: any) => {
      showError(err.message || 'Failed to reschedule follow-up');
    },
  });

  const handleOpenReschedule = (fu: any) => {
    setRescheduleItem({
      id: fu.id,
      leadName: fu.lead_name,
      currentDate: fu.follow_up_date,
      currentStatus: fu.status,
    });
    setNewDate(fu.follow_up_date);
    setNewTime(fu.follow_up_time ? fu.follow_up_time.slice(0, 5) : '10:00');
    setNewStatus(fu.status);
    setNewNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-pu-gold" />
              <span>Follow-up Command Centre (Kanban)</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pu-gold/20 text-pu-gold border border-pu-gold/30">
              Pipeline
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Visual pipeline organizing prospective students across timeline stages with quick rescheduling.
          </p>
        </div>
      </div>

      {/* 5-Column Kanban Board Layout (Section 38) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        {COLUMNS.map((col) => {
          const items = groupedData[col.id] || [];
          const Icon = col.icon;

          return (
            <div
              key={col.id}
              className="rounded-2xl glass-dark border border-white/10 flex flex-col max-h-[750px] overflow-hidden shadow-xl"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/25">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-300" />
                  <span className="text-xs font-bold text-white tracking-wide">
                    {col.title}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${col.badgeColor}`}>
                  {items.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[300px]">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-28 bg-white/5 rounded-xl animate-pulse" />
                    <div className="h-28 bg-white/5 rounded-xl animate-pulse" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No inquiries in this stage
                  </div>
                ) : (
                  items.map((fu: any) => (
                    <div
                      key={fu.id}
                      onClick={() => {
                        setSelectedLeadId(fu.lead_id);
                        setIsDrawerOpen(true);
                      }}
                      className="p-3.5 rounded-xl glass-subtle border border-white/10 hover:border-white/25 hover:bg-white/[0.08] transition-all duration-150 cursor-pointer space-y-2.5 text-xs shadow-md"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-white text-sm tracking-tight truncate block">
                          {fu.lead_name}
                        </span>
                        <Badge variant="status" value={fu.status} size="sm">
                          {fu.status}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-slate-300 flex items-center justify-between">
                        <span className="font-mono text-slate-400">{fu.lead_mobile}</span>
                        <span className="text-pu-gold font-semibold flex items-center gap-1">
                          <span>{fu.follow_up_date}</span>
                          {fu.follow_up_time && (
                            <span className="text-[10px] px-1 py-0.2 rounded bg-pu-gold/20 font-mono">
                              {fu.follow_up_time.slice(0, 5)} IST
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 truncate">
                        Counsellor: <strong className="text-slate-200">{fu.employee_name}</strong>
                      </div>

                      {fu.note && (
                        <p className="text-[11px] text-slate-300 line-clamp-2 bg-black/20 p-2 rounded-lg leading-relaxed">
                          {fu.note}
                        </p>
                      )}

                      {/* Card Actions (Call, WhatsApp, Reschedule) */}
                      <div
                        className="pt-2 border-t border-white/10 flex items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:+91${fu.lead_mobile}`}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-sky-400"
                            title="Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/91${fu.lead_mobile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        <button
                          onClick={() => handleOpenReschedule(fu)}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[10px] font-bold flex items-center gap-1"
                        >
                          <CalendarPlus className="w-3 h-3 text-pu-gold" />
                          <span>Reschedule</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reschedule Modal */}
      {rescheduleItem && (
        <GlassModal
          isOpen={Boolean(rescheduleItem)}
          onClose={() => setRescheduleItem(null)}
          title={`Reschedule Follow-up: ${rescheduleItem.leadName}`}
          size="sm"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="New Follow-up Date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
              />

              <Input
                label="Follow-up Time (IST)"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>

            <Select
              label="Update Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              options={[
                { value: 'Follow Up', label: 'Follow Up' },
                { value: 'Interested', label: 'Interested' },
                { value: 'Admission Done', label: 'Admission Done' },
                { value: 'Not Interested', label: 'Not Interested' },
              ]}
            />

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Reason / Follow-up Log Note
              </label>
              <textarea
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Candidate requested callback next Monday afternoon..."
                className="w-full rounded-xl p-2.5 text-xs glass-input text-white resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRescheduleItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={rescheduleMutation.isPending}
                onClick={() => rescheduleMutation.mutate()}
              >
                Save Schedule
              </Button>
            </div>
          </div>
        </GlassModal>
      )}

      {/* Lead Drawer */}
      <LeadDetailDrawer
        leadId={selectedLeadId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLeadId(null);
        }}
        onLeadUpdated={() => refetch()}
      />
    </div>
  );
};
