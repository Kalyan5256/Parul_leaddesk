import React from 'react';
import { Calendar, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AttendanceRecord } from '../../types/attendance';

interface EmployeeAttendanceHistoryProps {
  records: AttendanceRecord[];
  month: string;
  onMonthChange: (newMonth: string) => void;
  isLoading: boolean;
}

export const EmployeeAttendanceHistory: React.FC<EmployeeAttendanceHistoryProps> = ({
  records,
  month,
  onMonthChange,
  isLoading,
}) => {
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '-';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(isoString));
  };

  const formatMinutes = (mins: number) => {
    if (!mins || mins <= 0) return '0 hrs 0 mins';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const fullDays = records.filter((r) => r.status === 'present').length;
  const halfDays = records.filter((r) => r.status === 'half_day').length;
  const approvedLeaves = records.filter((r) => r.status === 'leave').length;
  const payableDays = fullDays + halfDays * 0.5 + approvedLeaves;
  const totalWorkedDays = fullDays + halfDays;
  const totalMinutes = records.reduce((acc, r) => acc + (r.total_minutes || 0), 0);
  const totalMissing = records.filter((r) => Boolean(r.check_in_time) && !r.check_out_time).length;

  return (
    <div className="glass-dark border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl mt-8">
      {/* Header & Month Picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pu-gold" />
            <span>Monthly Attendance History</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Personal attendance log, payable days, and shift verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Month:
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-pu-gold"
          />
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl glass-subtle border border-white/10">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Payable Days (Salary)
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
            {payableDays % 1 === 0 ? payableDays : payableDays.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {fullDays} Full | {halfDays} Half
          </div>
        </div>

        <div className="p-4 rounded-xl glass-subtle border border-white/10">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Working Hours
          </div>
          <div className="text-2xl font-extrabold text-pu-gold mt-1 font-mono">
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {records.length} logged shift(s)
          </div>
        </div>

        <div className="p-4 rounded-xl glass-subtle border border-white/10">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Avg Daily Hours
          </div>
          <div className="text-2xl font-extrabold text-slate-200 mt-1 font-mono">
            {totalWorkedDays > 0 ? formatMinutes(Math.round(totalMinutes / totalWorkedDays)) : '0h 0m'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Per worked day
          </div>
        </div>

        <div className="p-4 rounded-xl glass-subtle border border-white/10">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Missing Check-outs
          </div>
          <div
            className={`text-2xl font-extrabold mt-1 font-mono ${
              totalMissing > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {totalMissing}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {totalMissing === 0 ? 'All shifts closed' : 'Requires admin review'}
          </div>
        </div>
      </div>

      {/* History Table */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading monthly history...</div>
      ) : records.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          No attendance records logged for {month}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-black/40 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Workstation</th>
                <th className="py-3 px-4">Notes / Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {records.map((r) => {
                const dateObj = new Date(r.attendance_date + 'T00:00:00Z');
                const dayName = new Intl.DateTimeFormat('en-IN', {
                  timeZone: 'UTC',
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                }).format(dateObj);

                return (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-white">{dayName}</td>
                    <td className="py-3 px-4">
                      {r.status === 'present' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Full Day</span>
                        </span>
                      ) : r.status === 'half_day' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>Half Day</span>
                        </span>
                      ) : r.status === 'leave' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          <span>Leave</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          <span>{r.status || 'Absent'}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">{formatTime(r.check_in_time)}</td>
                    <td className="py-3 px-4 font-mono">
                      {r.check_out_time ? (
                        formatTime(r.check_out_time)
                      ) : (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Missing</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-100">
                      {formatMinutes(r.total_minutes)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{r.device_name || 'Office Laptop'}</span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      {r.is_corrected ? (
                        <span className="text-amber-300">
                          Admin Correction: {r.correction_reason}
                        </span>
                      ) : (
                        r.notes || '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

