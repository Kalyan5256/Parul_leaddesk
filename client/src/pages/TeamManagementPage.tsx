import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Avatar } from '../components/ui/Avatar';
import { GlassModal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import {
  Users,
  UserPlus,
  Shield,
  Edit2,
  CheckCircle,
  XCircle,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

export const TeamManagementPage: React.FC = () => {
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // New User Form State (Section 40)
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('1234');
  const [newRole, setNewRole] = useState<'employee' | 'team_lead' | 'manager'>('employee');
  const [newTeam, setNewTeam] = useState('Team A');
  const [newPhone, setNewPhone] = useState('');

  // Fetch Users
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['team-management-users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data || [];
    },
  });

  // Fetch performance stats
  const { data: stats = [] } = useQuery({
    queryKey: ['team-stats'],
    queryFn: async () => {
      const res = await api.get('/reports/employee-stats');
      return res.data || [];
    },
  });

  const statsMap = new Map(stats.map((s: any) => [s.id, s]));

  // Create User Mutation (Section 40)
  const createUserMutation = useMutation({
    mutationFn: () =>
      api.post('/users', {
        full_name: newFullName,
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole,
        team: newTeam,
        phone: newPhone,
      }),
    onSuccess: (res: any) => {
      success(res.message || 'Counsellor onboarded successfully');
      setIsAddUserModalOpen(false);
      setNewFullName('');
      setNewUsername('');
      setNewEmail('');
      setNewPhone('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['team-management-users'] });
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
    },
    onError: (err: any) => {
      showError(err.message || 'Failed to create user');
    },
  });

  // Update User Status Mutation (Activate/Deactivate)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/users/${id}/status`, { is_active }),
    onSuccess: (res: any) => {
      success(res.message || 'Status updated');
      refetch();
    },
    onError: (err: any) => {
      showError(err.message || 'Failed to update user status');
    },
  });

  // Update User Details Mutation
  const updateUserMutation = useMutation({
    mutationFn: () =>
      api.patch(`/users/${editingUser.id}`, {
        full_name: editingUser.full_name,
        role: editingUser.role,
        team: editingUser.team,
        phone: editingUser.phone,
      }),
    onSuccess: () => {
      success('User profile updated');
      setEditingUser(null);
      refetch();
    },
    onError: (err: any) => {
      showError(err.message || 'Failed to update user');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-pu-gold" />
            <span>Admission Team Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Manage counselling staff, assign teams, onboard new team members, and monitor compliance.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsAddUserModalOpen(true)}
        >
          Add New Team Member
        </Button>
      </div>

      {/* Users Table */}
      <GlassCard variant="default" padding="none">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-bold text-white">Active Counselling Team</span>
          <span className="text-xs text-slate-400">{users.length} Total Users</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="text-[11px] uppercase bg-white/5 text-slate-400 border-b border-white/10 select-none">
              <tr>
                <th scope="col" className="px-4 py-3.5 font-bold">Staff Member</th>
                <th scope="col" className="px-4 py-3.5 font-bold">Role</th>
                <th scope="col" className="px-4 py-3.5 font-bold">Team</th>
                <th scope="col" className="px-4 py-3.5 font-bold">Status</th>
                <th scope="col" className="px-4 py-3.5 font-bold">Total Leads</th>
                <th scope="col" className="px-4 py-3.5 font-bold">Admissions</th>
                <th scope="col" className="px-4 py-3.5 font-bold">Conv %</th>
                <th scope="col" className="px-4 py-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u: any) => {
                const stat: any = statsMap.get(u.id);
                return (
                  <tr key={u.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name} size="sm" />
                        <div>
                          <span className="font-bold text-white block">
                            {u.full_name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            @{u.username} • {u.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge variant="role" value={u.role} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-200">
                      {u.team || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.is_active
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-white">
                      {stat?.totalLeads ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-emerald-400">
                      {stat?.admissions ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-bold text-pu-gold">
                      {stat ? `${stat.conversionRate}%` : '—'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                          title="Edit member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: u.id,
                              is_active: !u.is_active,
                            })
                          }
                          className={`p-1.5 rounded-lg text-xs font-semibold ${
                            u.is_active
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                          }`}
                          title={u.is_active ? 'Deactivate account' : 'Activate account'}
                        >
                          {u.is_active ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Add User Modal (Section 40) */}
      <GlassModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Onboard New Counsellor / Staff"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createUserMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Full Name"
            placeholder="e.g. Priyanshi Mehta"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Username"
              placeholder="e.g. employee7"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
            />
            <Input
              label="Contact Phone"
              placeholder="9876543210"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>

          <Input
            label="Institutional Email"
            type="email"
            placeholder="priyanshi.m@paruluniversity.ac.in"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />

          <Input
            label="Temporary Password"
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as any)}
              options={[
                { value: 'employee', label: 'Admission Counsellor (Employee)' },
                { value: 'team_lead', label: 'Team Lead' },
                { value: 'manager', label: 'Manager' },
              ]}
            />

            <Select
              label="Assigned Team"
              value={newTeam}
              onChange={(e) => setNewTeam(e.target.value)}
              options={[
                { value: 'Team A', label: 'Team A' },
                { value: 'Team B', label: 'Team B' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsAddUserModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={createUserMutation.isPending}
            >
              Create Account
            </Button>
          </div>
        </form>
      </GlassModal>

      {/* Edit User Modal */}
      {editingUser && (
        <GlassModal
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          title={`Edit Profile: ${editingUser.full_name}`}
          size="sm"
        >
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={editingUser.full_name}
              onChange={(e) =>
                setEditingUser({ ...editingUser, full_name: e.target.value })
              }
            />

            <Select
              label="Team"
              value={editingUser.team || ''}
              onChange={(e) =>
                setEditingUser({ ...editingUser, team: e.target.value })
              }
              options={[
                { value: 'Team A', label: 'Team A' },
                { value: 'Team B', label: 'Team B' },
              ]}
            />

            <Select
              label="Role"
              value={editingUser.role}
              onChange={(e) =>
                setEditingUser({ ...editingUser, role: e.target.value })
              }
              options={[
                { value: 'employee', label: 'Employee' },
                { value: 'team_lead', label: 'Team Lead' },
                { value: 'manager', label: 'Manager' },
              ]}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={updateUserMutation.isPending}
                onClick={() => updateUserMutation.mutate()}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </GlassModal>
      )}
    </div>
  );
};
