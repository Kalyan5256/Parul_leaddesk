import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { EmptyState } from '../components/ui/EmptyState';
import { LeadDetailDrawer } from '../components/leads/LeadDetailDrawer';
import {
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Phone,
  MessageCircle,
  Edit3,
} from 'lucide-react';

export const FollowUpsPage: React.FC = () => {
  const [activeGroup, setActiveGroup] = useState<
    'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED'
  >('TODAY');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: followUps = [], isLoading, refetch } = useQuery({
    queryKey: ['follow-ups-page', activeGroup],
    queryFn: async () => {
      const res = await api.get('/follow-ups', { group: activeGroup });
      return res.data || [];
    },
  });

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const calculateOverdueDays = (dateStr: string) => {
    const diffTime = new Date(todayStr).getTime() - new Date(dateStr).getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleOpenLead = (id: string) => {
    setSelectedLeadId(id);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-pu-gold" />
            <span>Candidate Follow-up Command Queue</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Organized queues for overdue inquiries, today's counselling appointments, and upcoming commitments.
          </p>
        </div>
      </div>

      {/* Group Tabs (Section 29: OVERDUE, TODAY, UPCOMING, COMPLETED) */}
      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          value={activeGroup}
          onChange={(val) => setActiveGroup(val as any)}
          options={[
            {
              value: 'OVERDUE',
              label: 'Overdue Queue',
              icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
            },
            {
              value: 'TODAY',
              label: "Today's Follow-ups",
              icon: <Calendar className="w-4 h-4 text-pu-gold" />,
            },
            {
              value: 'UPCOMING',
              label: 'Upcoming',
              icon: <Clock className="w-4 h-4 text-sky-400" />,
            },
            {
              value: 'COMPLETED',
              label: 'Done / Enrolled',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
            },
          ]}
        />
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : followUps.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={`No ${activeGroup.toLowerCase()} follow-ups`}
          description="You are completely up to date with this follow-up queue!"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {followUps.map((fu: any) => {
            const overdueDays =
              activeGroup === 'OVERDUE'
                ? calculateOverdueDays(fu.follow_up_date)
                : 0;

            return (
              <GlassCard
                key={fu.id}
                variant="interactive"
                padding="md"
                onClick={() => handleOpenLead(fu.lead_id)}
                className="flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {fu.lead_name}
                      </h3>
                      <span className="font-mono text-xs text-slate-300 block mt-0.5">
                        {fu.lead_mobile}
                      </span>
                    </div>

                    <Badge variant="status" value={fu.status} size="sm">
                      {fu.status}
                    </Badge>
                  </div>

                  {/* Overdue indicator or date */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Scheduled Date:</span>
                    <span className="font-semibold text-white">
                      {fu.follow_up_date}
                    </span>
                  </div>

                  {overdueDays > 0 && (
                    <div className="mt-2 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-400/30 text-xs font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>{overdueDays} {overdueDays === 1 ? 'day' : 'days'} overdue!</span>
                    </div>
                  )}

                  {fu.note && (
                    <p className="mt-3 text-xs text-slate-300 line-clamp-2 bg-black/20 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                      {fu.note}
                    </p>
                  )}
                </div>

                {/* Quick Actions (Call, WhatsApp, Log) */}
                <div
                  className="pt-3 border-t border-white/10 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:+91${fu.lead_mobile}`}
                      className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-sky-400"
                      title="Call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href={`https://wa.me/91${fu.lead_mobile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenLead(fu.lead_id)}
                  >
                    Log Follow-up
                  </Button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Drawer */}
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
