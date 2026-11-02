import React, { useState, useEffect } from 'react';
import { Clock, Laptop, ShieldCheck, AlertCircle, ShieldAlert } from 'lucide-react';
import { EmployeeDevice } from '../../types/attendance';

interface AttendanceClockProps {
  device: EmployeeDevice | null;
  hasLocalKey: boolean;
  onRegisterClick?: () => void;
}

export const AttendanceClock: React.FC<AttendanceClockProps> = ({
  device,
  hasLocalKey,
  onRegisterClick,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // IST Formatter
      const timeFmt = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const dateFmt = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      setTimeStr(timeFmt.format(now));
      setDateStr(dateFmt.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-dark border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      {/* Background Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-pu-gold/10 rounded-full blur-3xl pointer-events-none" />

      {/* Clock & Date */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pu-gold mb-1">
          <Clock className="w-4 h-4" />
          <span>India Standard Time (IST)</span>
        </div>
        <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
          {timeStr || '--:--:--'}
        </div>
        <div className="text-sm text-slate-300 mt-1 font-medium">{dateStr || 'Loading...'}</div>
      </div>

      {/* Device Status Badge & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {device?.status === 'approved' && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>Verified Office Laptop</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[11px] text-slate-300 truncate max-w-[200px]">
                {device.device_name}
              </div>
            </div>
          </div>
        )}

        {device?.status === 'pending' && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold leading-tight">Laptop Approval Pending</div>
              <div className="text-[11px] text-slate-300">Admin verification required</div>
            </div>
          </div>
        )}

        {device?.status === 'revoked' && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="text-xs font-bold leading-tight">Laptop Revoked</div>
              <div className="text-[11px] text-slate-300">Contact administrator</div>
            </div>
          </div>
        )}

        {!device && (
          <button
            onClick={onRegisterClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pu-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-pu-navy font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Laptop className="w-4 h-4" />
            <span>{hasLocalKey ? 'Check Device Status' : 'Register Office Laptop'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

