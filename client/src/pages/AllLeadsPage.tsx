import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { GlassModal } from '../components/ui/Modal';
import { LeadDetailDrawer } from '../components/leads/LeadDetailDrawer';
import {
  Database,
  Download,
  Filter,
  UserCheck,
  CheckSquare,
  Square,
  Phone,
  MessageCircle,
  Eye,
  Trash2,
  Users,
  RotateCcw,
} from 'lucide-react';

export const AllLeadsPage: React.FC = () => {
  const { user, isAdmin, isManager } = useAuth();
  const canManageLeads = isAdmin || isManager;
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  // Filters (Section 35)
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // Bulk Selection (Section 36)
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');

  // Export & Delete Not Interested State
  const [isExportDeleteModalOpen, setIsExportDeleteModalOpen] = useState(false);

  // Lead detail drawer
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch count of Not Interested leads
  const { data: notInterestedCount = 0, refetch: refetchNotInterestedCount } = useQuery({
    queryKey: ['not-interested-count'],
    queryFn: async () => {
      const res = await api.get('/leads/not-interested/count');
      return res.count || 0;
    },
    enabled: canManageLeads,
  });

  // Export & Delete Not Interested Mutation
  const exportDeleteMutation = useMutation({
    mutationFn: () => api.post('/leads/export-and-delete-not-interested'),
    onSuccess: async (res: any) => {
      setIsExportDeleteModalOpen(false);
      if (res.exportedCount > 0 && res.filename) {
        success(`Successfully exported and deleted ${res.deletedCount} 'Not Interested' leads.`);
        try {
          await api.downloadExcel(
            `/leads/exports/download/${res.filename}`,
            res.filename
          );
        } catch (dlErr: any) {
          console.warn('Auto-download notice:', dlErr);
        }
      } else {
        success(res.message || 'Operation completed');
      }
      refetch();
      refetchNotInterestedCount();
      queryClient.invalidateQueries({ queryKey: ['all-leads'] });
      queryClient.invalidateQueries({ queryKey: ['not-interested-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
    onError: (err: any) => {
      showError(err.message || 'Failed to export and delete Not Interested leads');
    },
  });

  // Fetch Users for reassignment & filters
  const { data: usersData } = useQuery({
    queryKey: ['team-users-leads'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data || [];
    },
  });

  const counsellors = (usersData || []).filter((u: any) => u.role === 'employee');

  // Fetch Leads (Server-side paginated & filtered)
  const {
    data: leadsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'all-leads',
      search,
      employeeFilter,
      statusFilter,
      typeFilter,
      courseFilter,
      startDate,
      endDate,
      page,
      limit,
    ],
    queryFn: async () => {
      const res = await api.get('/leads', {
        search,
        employee_id: employeeFilter || undefined,
        status: statusFilter,
        lead_type: typeFilter,
        course: courseFilter,
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

  // Reassignment mutation
  const assignMutation = useMutation({
    mutationFn: () =>
      api.post('/leads/assign', {
        lead_ids: selectedLeadIds,
        target_employee_id: targetEmployeeId,
      }),
    onSuccess: (res: any) => {
      success(res.message || 'Leads reassigned successfully');
      setSelectedLeadIds([]);
      setIsBulkAssignModalOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['all-leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
    onError: (err: any) => {
      showError(err.message || 'Failed to reassign leads');
    },
  });

  // Select all on current page
  const handleToggleSelectAll = () => {
    if (selectedLeadIds.length === leads.length && leads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l: any) => l.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Export filtered CSV (Section 37)
  const handleExportCsv = async () => {
    await api.downloadCsv(
      '/leads/export',
      `parul-all-leads-${new Date().toISOString().split('T')[0]}.csv`,
      {
        search,
        employee_id: employeeFilter || undefined,
        status: statusFilter,
        lead_type: typeFilter,
        course: courseFilter,
        startDate,
        endDate,
      }
    );
  };

  const handleOpenLead = (id: string) => {
    setSelectedLeadId(id);
    setIsDrawerOpen(true);
  };

  const resetFilters = () => {
    setSearch('');
    setEmployeeFilter('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setCourseFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-pu-gold" />
            <span>Master Lead Management Desk</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Global repository with multi-attribute filtering, bulk reassignments, and complete candidate histories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedLeadIds.length > 0 && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<UserCheck className="w-4 h-4" />}
              onClick={() => setIsBulkAssignModalOpen(true)}
            >
              Assign ({selectedLeadIds.length})
            </Button>
          )}

          {canManageLeads && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<Trash2 className="w-4 h-4 text-rose-400" />}
              onClick={() => {
                if (notInterestedCount === 0) {
                  success('There are no leads marked "Not Interested" to export or delete.');
                  return;
                }
                setIsExportDeleteModalOpen(true);
              }}
              className="border-rose-500/30 hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-300 font-semibold"
            >
              <span>Export & Delete Not Interested</span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {notInterestedCount}
              </span>
            </Button>
          )}

          <Button
            variant="outline"
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportCsv}
          >
            Export Filtered CSV
          </Button>
        </div>
      </div>

      {/* Comprehensive Filter Bar (Section 35) */}
      <GlassCard variant="default" padding="sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search by name or mobile */}
          <div className="lg:col-span-3">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search student or mobile..."
            />
          </div>

          {/* Counsellor Filter */}
          <div className="lg:col-span-3">
            <select
              value={employeeFilter}
              onChange={(e) => {
                setEmployeeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl px-3 py-2 text-xs sm:text-sm glass-input text-white cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Counsellors</option>
              {counsellors.map((c: any) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-3">
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

          {/* Reset button */}
          <div className="lg:col-span-1 flex justify-end">
            <button
              onClick={resetFilters}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Leads Table & Cards View */}
      <GlassCard variant="default" padding="none">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No Leads Found"
            description="No inquiries match your current filter parameters. Try clearing the filter."
            actionText="Reset Filters"
            onAction={resetFilters}
          />
        ) : (
          <>
            {/* Sticky Table Header (Section 35) */}
            <div className="hidden md:block overflow-x-auto max-h-[640px]">
              <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                <thead className="sticky top-0 z-10 text-xs uppercase bg-[#0B2A5B]/90 backdrop-blur-md text-slate-300 border-b border-white/10 select-none">
                  <tr>
                    <th scope="col" className="px-4 py-3.5 w-10">
                      <button
                        onClick={handleToggleSelectAll}
                        className="text-slate-400 hover:text-white"
                        aria-label="Select all"
                      >
                        {selectedLeadIds.length === leads.length && leads.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-pu-gold" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Date</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Candidate</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Mobile</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Counsellor</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Channel</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Course</th>
                    <th scope="col" className="px-4 py-3.5 font-bold">Status</th>
                    <th scope="col" className="px-4 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leads.map((lead: any) => {
                    const isSelected = selectedLeadIds.includes(lead.id);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => handleOpenLead(lead.id)}
                        className={`hover:bg-white/[0.04] transition-colors cursor-pointer ${
                          isSelected ? 'bg-pu-gold/10' : ''
                        }`}
                      >
                        <td
                          className="px-4 py-3.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelectOne(lead.id);
                          }}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-pu-gold" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-400">
                          {lead.report_date}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-white">
                          {lead.lead_name}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs text-slate-300">
                          {lead.mobile}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-200">
                          {lead.employee_name || 'Staff'}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="type" value={lead.lead_type} size="sm">
                            {lead.lead_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 max-w-[180px] truncate text-slate-300">
                          {lead.course}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="status" value={lead.status} size="sm">
                            {lead.status}
                          </Badge>
                        </td>
                        <td
                          className="px-4 py-3.5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`tel:+91${lead.mobile}`}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-sky-400"
                              title="Call"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                            <a
                              href={`https://wa.me/91${lead.mobile}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleOpenLead(lead.id)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                              title="Drawer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Section 35, 48) */}
            <div className="md:hidden divide-y divide-white/10">
              {leads.map((lead: any) => {
                const isSelected = selectedLeadIds.includes(lead.id);
                return (
                  <div
                    key={lead.id}
                    onClick={() => handleOpenLead(lead.id)}
                    className={`p-4 space-y-3 hover:bg-white/5 cursor-pointer ${
                      isSelected ? 'bg-pu-gold/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelectOne(lead.id);
                          }}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-pu-gold" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                        <div>
                          <h4 className="text-base font-bold text-white">{lead.lead_name}</h4>
                          <span className="text-xs text-slate-400">{lead.course}</span>
                        </div>
                      </div>
                      <Badge variant="status" value={lead.status} size="sm">
                        {lead.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Counsellor: {lead.employee_name}</span>
                      <Badge variant="type" value={lead.lead_type} size="sm">
                        {lead.lead_type}
                      </Badge>
                    </div>

                    <div
                      className="flex items-center justify-between pt-2 border-t border-white/5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="font-mono text-sm font-semibold text-white">
                        {lead.mobile}
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:+91${lead.mobile}`}
                          className="p-2 rounded-xl bg-blue-500/20 text-sky-400"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <a
                          href={`https://wa.me/91${lead.mobile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Server-side Pagination (Section 35) */}
            <div className="p-4 border-t border-white/10">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                pageSize={limit}
                pageSizeOptions={[25, 50, 100]}
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

      {/* Bulk Reassignment Modal (Section 36) */}
      <GlassModal
        isOpen={isBulkAssignModalOpen}
        onClose={() => setIsBulkAssignModalOpen(false)}
        title="Reassign Selected Inquiries"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            You have selected <strong className="text-pu-gold">{selectedLeadIds.length} leads</strong>.
            Choose a counsellor to transfer ownership:
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Target Counsellor
            </label>
            <select
              value={targetEmployeeId}
              onChange={(e) => setTargetEmployeeId(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm glass-input text-white"
            >
              <option value="" className="bg-slate-900">Select Counsellor...</option>
              {counsellors.map((c: any) => (
                <option key={c.id} value={c.id} className="bg-slate-900">
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsBulkAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!targetEmployeeId}
              isLoading={assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              Confirm Reassignment
            </Button>
          </div>
        </div>
      </GlassModal>

      {/* Export & Delete Not Interested Confirmation Modal */}
      <GlassModal
        isOpen={isExportDeleteModalOpen}
        onClose={() => {
          if (!exportDeleteMutation.isPending) {
            setIsExportDeleteModalOpen(false);
          }
        }}
        title="Export & Delete Not Interested Leads"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs sm:text-sm space-y-2">
            <div className="font-bold flex items-center gap-2 text-rose-300 text-sm">
              <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Administrative Confirmation</span>
            </div>
            <p className="leading-relaxed">
              All <strong className="text-white font-semibold">{notInterestedCount}</strong> lead(s) currently marked as{' '}
              <strong className="text-rose-300 font-semibold">'Not Interested'</strong> will be compiled into an Excel (<code>.xlsx</code>) archive file with complete contact information, counsellor assignments, and all recorded follow-up history.
            </p>
            <p className="leading-relaxed">
              Only after the file is successfully generated and verified in secure storage, these leads will be <strong className="text-white font-semibold">permanently removed from active CRM views</strong>.
            </p>
            <p className="text-[11px] text-rose-300/80">
              ✓ Leads with other statuses (New, Interested, Follow Up, Admission Done, Wrong Number) remain completely untouched.
            </p>
          </div>

          <div className="bg-black/30 rounded-xl p-3 border border-white/10 text-xs text-slate-300 space-y-1.5">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span>Target Lead Status:</span>
              <span className="font-bold text-rose-300">Not Interested</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span>Records to Export & Delete:</span>
              <span className="font-bold text-white">{notInterestedCount} Lead(s)</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Export Format:</span>
              <span className="font-bold text-pu-gold">Excel (.xlsx) with Follow-up History</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={exportDeleteMutation.isPending}
              onClick={() => setIsExportDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              isLoading={exportDeleteMutation.isPending}
              onClick={() => exportDeleteMutation.mutate()}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/30"
            >
              {exportDeleteMutation.isPending ? 'Exporting & Deleting...' : 'Confirm Export & Delete'}
            </Button>
          </div>
        </div>
      </GlassModal>

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
