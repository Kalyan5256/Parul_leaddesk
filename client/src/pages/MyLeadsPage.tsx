import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/ui/StatCard';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { LeadDetailDrawer } from '../components/leads/LeadDetailDrawer';
import {
  FolderKanban,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Phone,
  MessageCircle,
  Eye,
  Sparkles,
  Inbox,
  Filter,
} from 'lucide-react';

export const MyLeadsPage: React.FC = () => {
  const { user } = useAuth();

  // Search & Filter States (Section 27)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Selected lead for detail drawer (Section 28)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch KPI cards for employee
  const { data: kpisData } = useQuery({
    queryKey: ['my-kpis', user?.id],
    queryFn: async () => {
      const res = await api.get('/reports/kpis');
      return res.data;
    },
  });

  // Fetch leads with server-side filters & pagination
  const {
    data: leadsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'my-leads',
      user?.id,
      search,
      statusFilter,
      typeFilter,
      startDate,
      endDate,
      page,
      limit,
    ],
    queryFn: async () => {
      const res = await api.get('/leads', {
        search,
        status: statusFilter,
        lead_type: typeFilter,
        startDate,
        endDate,
        page,
        limit,
      });
      return res;
    },
  });

  const leads = leadsData?.data || [];
  const pagination = leadsData?.pagination || { total: 0, totalPages: 1 };

  // Export CSV of own leads (Section 26, 37)
  const handleExportCsv = async () => {
    await api.downloadCsv(
      '/leads/export',
      `my-leads-export-${new Date().toISOString().split('T')[0]}.csv`,
      {
        search,
        status: statusFilter,
        lead_type: typeFilter,
        startDate,
        endDate,
      }
    );
  };

  const handleOpenLead = (id: string) => {
    setSelectedLeadId(id);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-pu-gold" />
            <span>My Counselling Leads</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Track inquiries assigned to you, initiate calls, send WhatsApp greetings, and schedule follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportCsv}
          >
            Export My CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards (Section 26) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Leads"
          value={kpisData?.totalLeads ?? '...'}
          icon={FolderKanban}
          accentColor="gold"
        />
        <StatCard
          title="Today's Leads"
          value={kpisData?.todayLeads ?? '...'}
          icon={Calendar}
          accentColor="cyan"
        />
        <StatCard
          title="Interested"
          value={kpisData?.interestedCount ?? '...'}
          icon={Sparkles}
          accentColor="blue"
        />
        <StatCard
          title="Admission Done"
          value={kpisData?.admissionDoneCount ?? '...'}
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <StatCard
          title="Follow-ups Due"
          value={kpisData?.followUpsDueToday ?? '...'}
          subtitle={kpisData?.overdueFollowUps ? `(${kpisData.overdueFollowUps} overdue)` : undefined}
          icon={Clock}
          accentColor="red"
        />
      </div>

      {/* Filter Bar (Section 27) */}
      <GlassCard variant="default" padding="sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search by Name or Mobile */}
          <div className="lg:col-span-4">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search candidate name or mobile..."
            />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl px-3 py-2 text-xs sm:text-sm glass-input text-white cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Statuses</option>
              <option value="New" className="bg-slate-900">New</option>
              <option value="Interested" className="bg-slate-900">Interested</option>
              <option value="Follow Up" className="bg-slate-900">Follow Up</option>
              <option value="Admission Done" className="bg-slate-900">Admission Done</option>
              <option value="Not Interested" className="bg-slate-900">Not Interested</option>
              <option value="Wrong Number" className="bg-slate-900">Wrong Number</option>
            </select>
          </div>

          {/* Channel Type Filter */}
          <div className="lg:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl px-3 py-2 text-xs sm:text-sm glass-input text-white cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">All Channels</option>
              <option value="online" className="bg-slate-900">Online</option>
              <option value="offline" className="bg-slate-900">Offline</option>
            </select>
          </div>

          {/* Date Range Start & End */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              placeholder="From Date"
              className="w-1/2 rounded-xl px-2.5 py-1.5 text-xs glass-input text-white"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              placeholder="To Date"
              className="w-1/2 rounded-xl px-2.5 py-1.5 text-xs glass-input text-white"
            />
          </div>
        </div>
      </GlassCard>

      {/* Desktop Table & Mobile Cards (Section 26, 48) */}
      <GlassCard variant="default" padding="none">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No Leads Matching Filter"
            description="Try clearing search filters or submit a new daily lead report."
            actionText="Submit New Leads"
            onAction={() => (window.location.href = '/report')}
          />
        ) : (
          <>
            {/* Desktop Table View (Section 26) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-white/5 text-slate-400 border-b border-white/10 select-none">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 font-bold">Date</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Candidate Name</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Mobile</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Channel</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Course</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Status</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Follow-up</th>
                    <th scope="col" className="px-4 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leads.map((lead: any) => (
                    <tr
                      key={lead.id}
                      onClick={() => handleOpenLead(lead.id)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-400">
                        {lead.report_date}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-white">
                        {lead.lead_name}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-200">
                          {lead.mobile}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="type" value={lead.lead_type} size="sm">
                          {lead.lead_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px] truncate text-slate-200">
                        {lead.course}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="status" value={lead.status} size="sm">
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-400">
                        {lead.follow_up_date || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`tel:+91${lead.mobile}`}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-sky-400 transition-colors"
                            title="Call candidate"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://wa.me/91${lead.mobile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleOpenLead(lead.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                            title="View full drawer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Section 26, 48) */}
            <div className="md:hidden divide-y divide-white/10">
              {leads.map((lead: any) => (
                <div
                  key={lead.id}
                  onClick={() => handleOpenLead(lead.id)}
                  className="p-4 space-y-3 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">{lead.lead_name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{lead.course}</p>
                    </div>
                    <Badge variant="status" value={lead.status} size="sm">
                      {lead.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Date: {lead.report_date}</span>
                    <Badge variant="type" value={lead.lead_type} size="sm">
                      {lead.lead_type}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                    <span className="font-mono text-sm font-semibold text-white">
                      {lead.mobile}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:+91${lead.mobile}`}
                        className="p-2 rounded-xl bg-blue-500/20 text-sky-400"
                        title="Call"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <a
                        href={`https://wa.me/91${lead.mobile}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-white/10">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                pageSize={limit}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(sz) => {
                  setLimit(sz);
                  setPage(1);
                }}
              />
            </div>
          </>
        )}
      </GlassCard>

      {/* Slide-out Lead Details Drawer */}
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
