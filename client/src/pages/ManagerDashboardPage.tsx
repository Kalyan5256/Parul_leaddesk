import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { StatCard } from '../components/ui/StatCard';
import { GlassCard } from '../components/ui/GlassCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  CheckCircle2,
  Percent,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
  Filter,
  RotateCcw,
  ArrowUpDown,
  UserX,
} from 'lucide-react';

const STATUS_COLORS_MAP: Record<string, string> = {
  New: '#3B82F6',
  Interested: '#6366F1',
  'Follow Up': '#F5A800',
  'Admission Done': '#10B981',
  'Not Interested': '#64748B',
  'Wrong Number': '#EF4444',
};

const CHANNEL_COLORS_MAP: Record<string, string> = {
  Online: '#06B6D4',
  Offline: '#F5A800',
};

export const ManagerDashboardPage: React.FC = () => {
  // Global Dashboard Filters (Section 34)
  const [teamFilter, setTeamFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Leaderboard Sorting (Section 32)
  const [sortField, setSortField] = useState<'totalLeads' | 'today' | 'thisWeek' | 'admissions' | 'conversionRate'>('totalLeads');
  const [sortAsc, setSortAsc] = useState(false);

  // Fetch Users for filter dropdown
  const { data: usersData } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data || [];
    },
  });

  const employees = (usersData || []).filter((u: any) => u.role === 'employee');

  // Fetch Real KPIs from Database (Section 30, 57)
  const { data: kpisData } = useQuery({
    queryKey: ['dashboard-kpis', teamFilter, employeeFilter, startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/reports/kpis', {
        team: teamFilter || undefined,
        employee_id: employeeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      return res.data;
    },
  });

  // Fetch 30-Day Trend from Database (Section 31)
  const { data: trendData = [] } = useQuery({
    queryKey: ['dashboard-trend', teamFilter, employeeFilter],
    queryFn: async () => {
      const res = await api.get('/reports/trend', {
        days: 30,
        team: teamFilter || undefined,
        employee_id: employeeFilter || undefined,
      });
      return res.data || [];
    },
  });

  // Fetch Donut & Split Distributions from Database (Section 31)
  const { data: splitData } = useQuery({
    queryKey: ['dashboard-split', teamFilter, employeeFilter],
    queryFn: async () => {
      const res = await api.get('/reports/type-split', {
        team: teamFilter || undefined,
        employee_id: employeeFilter || undefined,
      });
      return res.data;
    },
  });

  // Fetch Leaderboard from Database (Section 32)
  const { data: leaderboardData = [] } = useQuery({
    queryKey: ['dashboard-leaderboard', teamFilter],
    queryFn: async () => {
      const res = await api.get('/reports/employee-stats', {
        team: teamFilter || undefined,
      });
      return res.data || [];
    },
  });

  // Fetch Not Submitted Today Panel from Database (Section 33)
  const { data: notSubmittedData } = useQuery({
    queryKey: ['dashboard-not-submitted'],
    queryFn: async () => {
      const res = await api.get('/reports/not-submitted');
      return res;
    },
  });

  const unsubmittedEmployees = notSubmittedData?.data || [];

  // Sort Leaderboard
  const sortedLeaderboard = [...leaderboardData].sort((a: any, b: any) => {
    const valA = a[sortField] || 0;
    const valB = b[sortField] || 0;
    return sortAsc ? valA - valB : valB - valA;
  });

  const top10Employees = [...leaderboardData]
    .sort((a, b) => b.totalLeads - a.totalLeads)
    .slice(0, 10);

  const resetFilters = () => {
    setTeamFilter('');
    setEmployeeFilter('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-pu-gold" />
              <span>Admission Performance Command</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pu-gold/20 text-pu-gold border border-pu-gold/30">
              Live DB
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Real-time university counselling analytics computed directly from the admission PostgreSQL database.
          </p>
        </div>

        {/* Not Submitted Today Warning Badge */}
        {unsubmittedEmployees.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>
              {unsubmittedEmployees.length} Counsellor{unsubmittedEmployees.length === 1 ? '' : 's'} pending report today
            </span>
          </div>
        )}
      </div>

      {/* Global Dashboard Filters Bar (Section 34) */}
      <GlassCard variant="default" padding="sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-1 flex items-center text-slate-300 text-xs font-bold gap-1.5 uppercase">
            <Filter className="w-4 h-4 text-pu-gold" />
            <span>Filters:</span>
          </div>

          {/* Filter by Team */}
          <div className="lg:col-span-3">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-xs sm:text-sm glass-input text-white cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Teams</option>
              <option value="Team A" className="bg-slate-900">Team A</option>
              <option value="Team B" className="bg-slate-900">Team B</option>
            </select>
          </div>

          {/* Filter by Specific Employee */}
          <div className="lg:col-span-3">
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-xs sm:text-sm glass-input text-white cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Counsellors</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id} className="bg-slate-900">
                  {emp.full_name} ({emp.team || 'No team'})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 rounded-xl px-2 py-1.5 text-xs glass-input text-white"
              title="From date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 rounded-xl px-2 py-1.5 text-xs glass-input text-white"
              title="To date"
            />
          </div>

          {/* Reset Filters */}
          <div className="lg:col-span-1 flex justify-end">
            <button
              onClick={resetFilters}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Clear all filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* KPI Cards Grid (Section 30, 57) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Leads"
          value={kpisData?.totalLeads ?? '...'}
          icon={TrendingUp}
          accentColor="gold"
        />
        <StatCard
          title="Today's Leads"
          value={kpisData?.todayLeads ?? '...'}
          icon={Calendar}
          accentColor="cyan"
        />
        <StatCard
          title="This Week"
          value={kpisData?.thisWeekLeads ?? '...'}
          subtitle={`Month: ${kpisData?.thisMonthLeads ?? '...'}`}
          icon={Clock}
          accentColor="blue"
        />
        <StatCard
          title="Admissions Done"
          value={kpisData?.admissionDoneCount ?? '...'}
          subtitle={`Interested: ${kpisData?.interestedCount ?? '...'}`}
          icon={CheckCircle2}
          accentColor="emerald"
        />
        <StatCard
          title="Conversion Rate"
          value={`${kpisData?.conversionRate ?? 0}%`}
          subtitle="Formula: (Admissions ÷ Total) × 100"
          icon={Percent}
          accentColor="gold"
        />
        <StatCard
          title="Follow-ups Due Today"
          value={kpisData?.followUpsDueToday ?? '...'}
          icon={Clock}
          accentColor="blue"
        />
        <StatCard
          title="Overdue Follow-ups"
          value={kpisData?.overdueFollowUps ?? '...'}
          icon={AlertTriangle}
          accentColor="red"
        />
        <StatCard
          title="Reporting Compliance"
          value={kpisData?.submittedSummary ?? '...'}
          subtitle="Active counsellors submitted today"
          icon={Users}
          accentColor="emerald"
        />
      </div>

      {/* Charts Row 1: 30-Day Trend (Area) & Top 10 Counsellors (Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Leads Per Day — Last 30 Days (Section 31) */}
        <GlassCard variant="default" padding="md" className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Leads Generated Daily (Last 30 Days)
              </h3>
              <p className="text-xs text-slate-400">
                Continuous volume tracking with Online vs Offline split
              </p>
            </div>
            <span className="text-xs font-semibold text-pu-gold px-2.5 py-1 rounded-lg bg-pu-gold/10 border border-pu-gold/20">
              30-Day Curve
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5A800" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F5A800" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="displayDate" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071A38',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: '#FFF',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Total Leads"
                  stroke="#F5A800"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
                <Area
                  type="monotone"
                  dataKey="online"
                  name="Online Inquiries"
                  stroke="#06B6D4"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorOnline)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Top 10 Employees Bar Chart (Section 31) */}
        <GlassCard variant="default" padding="md" className="lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Top Counsellors by Volume
              </h3>
              <p className="text-xs text-slate-400">Total inquiries logged</p>
            </div>
            <Users className="w-5 h-5 text-pu-gold" />
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top10Employees}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94A3B8"
                  fontSize={10}
                  tickFormatter={(val) => val.split(' ')[0]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071A38',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: '#FFF',
                  }}
                />
                <Bar dataKey="totalLeads" name="Total Leads" fill="#F5A800" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Charts Row 2: Status Distribution (Donut), Channel Split (Donut), Team Breakdown (Stacked Bar) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Status Distribution Donut (Section 31) */}
        <GlassCard variant="default" padding="md">
          <h3 className="text-sm font-bold text-white tracking-tight mb-2">
            Status Breakdown (Donut)
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={splitData?.statusDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {(splitData?.statusDistribution || []).map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS_MAP[entry.name] || '#8884d8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071A38',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: '#FFF',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 mt-2">
            {(splitData?.statusDistribution || []).slice(0, 4).map((item: any) => (
              <div key={item.name} className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: STATUS_COLORS_MAP[item.name] || '#8884d8' }}
                />
                <span className="truncate">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Online vs Offline Donut (Section 31) */}
        <GlassCard variant="default" padding="md">
          <h3 className="text-sm font-bold text-white tracking-tight mb-2">
            Channel Mix (Online vs Offline)
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={splitData?.typeSplit || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {(splitData?.typeSplit || []).map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHANNEL_COLORS_MAP[entry.name] || '#8884d8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071A38',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: '#FFF',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-around text-xs font-semibold text-slate-200 mt-2">
            {(splitData?.typeSplit || []).map((t: any) => (
              <div key={t.name} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CHANNEL_COLORS_MAP[t.name] }}
                />
                <span>{t.name}: {t.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Online vs Offline by Team (Stacked Bar) (Section 31) */}
        <GlassCard variant="default" padding="md">
          <h3 className="text-sm font-bold text-white tracking-tight mb-2">
            Channel Distribution by Team
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={splitData?.teamSplit || []}
                margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="team" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071A38',
                    borderColor: 'rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: '#FFF',
                  }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="online" name="Online" stackId="a" fill="#06B6D4" radius={[0, 0, 4, 4]} />
                <Bar dataKey="offline" name="Offline" stackId="a" fill="#F5A800" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Row 3: Leaderboard (Section 32) & Not Submitted Panel (Section 33) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Leaderboard Table (Section 32) */}
        <GlassCard variant="default" padding="none" className="lg:col-span-8">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Counsellor Performance Leaderboard
              </h3>
              <p className="text-xs text-slate-400">
                Click table headers to sort performance metrics
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {sortedLeaderboard.length} Counsellors
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300">
              <thead className="text-[11px] uppercase bg-white/5 text-slate-400 border-b border-white/10 select-none">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">Counsellor</th>
                  <th scope="col" className="px-4 py-3 font-bold">Team</th>
                  <th
                    scope="col"
                    onClick={() => {
                      setSortField('today');
                      setSortAsc(!sortAsc);
                    }}
                    className="px-4 py-3 font-bold cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Today</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => {
                      setSortField('totalLeads');
                      setSortAsc(!sortAsc);
                    }}
                    className="px-4 py-3 font-bold cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Total Leads</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">Interested</th>
                  <th
                    scope="col"
                    onClick={() => {
                      setSortField('admissions');
                      setSortAsc(!sortAsc);
                    }}
                    className="px-4 py-3 font-bold cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Admissions</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => {
                      setSortField('conversionRate');
                      setSortAsc(!sortAsc);
                    }}
                    className="px-4 py-3 font-bold cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Conv %</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedLeaderboard.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={emp.name} size="sm" />
                        <div>
                          <span className="font-bold text-white block">{emp.name}</span>
                          <span className="text-[10px] text-slate-400">@{emp.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-slate-300">{emp.team}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`font-bold ${emp.today > 0 ? 'text-pu-gold' : 'text-slate-500'}`}>
                        {emp.today}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-white">
                      {emp.totalLeads}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sky-400 font-semibold">
                      {emp.interested}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-emerald-400 font-bold">
                      {emp.admissions}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-pu-gold">
                      {emp.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Not Submitted Today Panel (Section 33) */}
        <GlassCard variant="default" padding="none" className="lg:col-span-4">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Not Submitted Today
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
              {unsubmittedEmployees.length} Pending
            </span>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-400">
              Active counsellors with 0 reports logged for today's date:
            </p>

            {unsubmittedEmployees.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-semibold flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span>100% Compliance! Every counsellor has submitted today's report.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {unsubmittedEmployees.map((emp: any) => (
                  <div
                    key={emp.id}
                    className="p-3 rounded-xl glass-subtle border border-rose-500/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={emp.full_name} size="sm" />
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {emp.full_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {emp.team || 'Unassigned'} • @{emp.username}
                        </span>
                      </div>
                    </div>

                    <a
                      href={`tel:+91${emp.phone}`}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold"
                    >
                      Remind
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
