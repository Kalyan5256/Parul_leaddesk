import React, { useState } from 'react';
import { GlassDrawer } from '../ui/Drawer';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Phone,
  MessageCircle,
  Calendar,
  User,
  GraduationCap,
  Clock,
  Send,
  PlusCircle,
  History,
  FileText,
  Tag,
} from 'lucide-react';

interface LeadDetailDrawerProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated?: () => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  leadId,
  isOpen,
  onClose,
  onLeadUpdated,
}) => {
  const { user, isEmployee } = useAuth();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [followUpStatus, setFollowUpStatus] = useState('Follow Up');
  const [followUpNote, setFollowUpNote] = useState('');

  // Fetch lead details
  const { data: lead, isLoading: isLoadingLead } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const res = await api.get(`/leads/${leadId}`);
      return res.data;
    },
    enabled: Boolean(leadId && isOpen),
  });

  // Fetch follow-up history
  const { data: followUps = [], refetch: refetchFollowUps } = useQuery({
    queryKey: ['follow-ups-lead', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const res = await api.get('/follow-ups', { lead_id: leadId });
      // filter for this lead if returned list
      return (res.data || []).filter((f: any) => f.lead_id === leadId);
    },
    enabled: Boolean(leadId && isOpen),
  });

  // Log follow-up mutation
  const logFollowUpMutation = useMutation({
    mutationFn: async () => {
      return api.post('/follow-ups', {
        lead_id: leadId,
        follow_up_date: followUpDate,
        follow_up_time: followUpTime || null,
        status: followUpStatus,
        note: followUpNote,
      });
    },
    onSuccess: () => {
      success('Follow-up recorded successfully');
      setIsAddingFollowUp(false);
      setFollowUpNote('');
      refetchFollowUps();
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      if (onLeadUpdated) onLeadUpdated();
    },
    onError: (err: any) => {
      showError(err.message || 'Failed to log follow-up');
    },
  });

  if (!isOpen) return null;

  return (
    <GlassDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={lead?.lead_name || 'Lead Details'}
      subtitle={lead ? `Mobile: ${lead.mobile} • ${lead.course}` : 'Loading candidate information...'}
      width="lg"
    >
      {isLoadingLead ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-20 bg-white/10 rounded-xl" />
          <div className="h-40 bg-white/10 rounded-xl" />
          <div className="h-32 bg-white/10 rounded-xl" />
        </div>
      ) : lead ? (
        <div className="space-y-6">
          {/* Quick Actions (Call & WhatsApp) */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`tel:+91${lead.mobile}`}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-sky-200 border border-blue-400/30 text-sm font-semibold transition-all duration-150 shadow-md"
            >
              <Phone className="w-4 h-4 text-sky-400" />
              <span>Call Candidate</span>
            </a>
            <a
              href={`https://wa.me/91${lead.mobile}?text=${encodeURIComponent(
                `Hello ${lead.lead_name}, greetings from Parul University Admission Counselling Cell regarding your enquiry for ${lead.course}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-400/30 text-sm font-semibold transition-all duration-150 shadow-md"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </a>
          </div>

          {/* Lead Information Card */}
          <div className="p-4 rounded-xl glass-subtle border border-white/10 space-y-4">
            <h4 className="text-xs font-bold text-pu-gold uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-3.5 h-3.5" />
              <span>Lead Overview</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 block">Current Status</span>
                <div className="mt-1">
                  <Badge variant="status" value={lead.status}>
                    {lead.status}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block">Lead Channel</span>
                <div className="mt-1">
                  <Badge variant="type" value={lead.lead_type}>
                    {lead.lead_type}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block">Next Follow-up</span>
                <span className="text-sm font-semibold text-white mt-1 block">
                  {lead.follow_up_date || 'None scheduled'}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-xs text-slate-400 block">Academic Program</span>
                <div className="flex items-center gap-1.5 text-white font-medium mt-1">
                  <GraduationCap className="w-4 h-4 text-pu-gold shrink-0" />
                  <span>{lead.course}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block">Report Date</span>
                <span className="text-sm text-slate-200 mt-1 block">
                  {lead.report_date}
                </span>
              </div>
            </div>

            {lead.remarks && (
              <div className="pt-3 border-t border-white/10">
                <span className="text-xs text-slate-400 block">Remarks / Notes</span>
                <p className="text-sm text-slate-200 mt-1 leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/5">
                  {lead.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Auditability Card (Section 51) */}
          <div className="p-4 rounded-xl glass-subtle border border-white/10 space-y-2 text-xs">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
              <History className="w-3.5 h-3.5" />
              <span>Audit Information</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div>
                <span className="text-slate-500 block">Assigned Counsellor:</span>
                <span className="font-semibold text-white">
                  {lead.employee_name || 'Staff Member'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Created Timestamp:</span>
                <span className="text-slate-300">
                  {new Date(lead.created_at).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Last Modification:</span>
                <span className="text-slate-300">
                  {new Date(lead.updated_at).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">System Lead ID:</span>
                <span className="font-mono text-slate-400">{lead.id}</span>
              </div>
            </div>
          </div>

          {/* Follow-up Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-pu-gold" />
                <span>Follow-up History & Log</span>
              </h4>
              {!isAddingFollowUp && (
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                  onClick={() => setIsAddingFollowUp(true)}
                >
                  Log Follow-up
                </Button>
              )}
            </div>

            {/* Log Follow-up Form */}
            {isAddingFollowUp && (
              <div className="p-4 rounded-xl glass border border-pu-gold/30 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-sm font-bold text-pu-gold">Log Counselling Follow-up</span>
                  <button
                    onClick={() => setIsAddingFollowUp(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    label="Next Follow-up Date"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    required
                  />

                  <Input
                    label="Follow-up Time (IST)"
                    type="time"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                  />

                  <Select
                    label="Update Status"
                    value={followUpStatus}
                    onChange={(e) => setFollowUpStatus(e.target.value)}
                    options={[
                      { value: 'Interested', label: 'Interested' },
                      { value: 'Follow Up', label: 'Follow Up' },
                      { value: 'Admission Done', label: 'Admission Done' },
                      { value: 'Not Interested', label: 'Not Interested' },
                      { value: 'Wrong Number', label: 'Wrong Number' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Counselling Notes / Candidate Feedback
                  </label>
                  <textarea
                    rows={3}
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    placeholder="Candidate requested campus visit, interested in hostel accommodation..."
                    className="w-full rounded-xl p-3 text-sm glass-input text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingFollowUp(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                    isLoading={logFollowUpMutation.isPending}
                    onClick={() => logFollowUpMutation.mutate()}
                  >
                    Save Follow-up
                  </Button>
                </div>
              </div>
            )}

            {/* Follow-up Timeline */}
            <div className="space-y-3 pt-2">
              {followUps.length === 0 ? (
                <div className="p-4 text-center rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400">
                  No prior follow-up logs recorded yet for this candidate.
                </div>
              ) : (
                followUps.map((fu: any) => (
                  <div
                    key={fu.id}
                    className="p-3.5 rounded-xl glass-subtle border border-white/10 space-y-1.5 text-xs relative pl-4 border-l-2 border-l-pu-gold"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <span>{fu.follow_up_date}</span>
                        {fu.follow_up_time && (
                          <span className="text-[10px] text-pu-gold px-1.5 py-0.5 rounded bg-pu-gold/10 font-mono">
                            {fu.follow_up_time.slice(0, 5)} IST
                          </span>
                        )}
                      </span>
                      <Badge variant="status" value={fu.status} size="sm">
                        {fu.status}
                      </Badge>
                    </div>
                    {fu.note && <p className="text-slate-300">{fu.note}</p>}
                    <span className="text-[10px] text-slate-500 block pt-1">
                      Logged by {fu.employee_name || 'Staff'} on{' '}
                      {new Date(fu.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400">Lead not found</div>
      )}
    </GlassDrawer>
  );
};
