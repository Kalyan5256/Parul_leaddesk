import React, { useState, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  Timer,
  Laptop,
} from 'lucide-react';
import { AttendanceRecord, EmployeeDevice } from '../../types/attendance';
import { DeviceAuthManager } from '../../lib/deviceAuth';

interface TodayAttendanceCardProps {
  employeeId: string;
  device: EmployeeDevice | null;
  todayRecord: AttendanceRecord | null;
  onRefresh: () => void;
  onOpenRegisterModal: () => void;
}

export const TodayAttendanceCard: React.FC<TodayAttendanceCardProps> = ({
  employeeId,
  device,
  todayRecord,
  onRefresh,
  onOpenRegisterModal,
}) => {
  const [notes, setNotes] = useState<string>('');
  const [shiftStatus, setShiftStatus] = useState<'present' | 'half_day'>('present');
  const [isOperating, setIsOperating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Status computation
  const isCheckedIn = Boolean(todayRecord?.check_in_time);
  const isCheckedOut = Boolean(todayRecord?.check_out_time);
  const isDeviceApproved = device?.status === 'approved';

  // Synchronize initial shift status from existing record if present
  useEffect(() => {
    if (todayRecord?.status === 'half_day') {
      setShiftStatus('half_day');
    } else if (todayRecord?.status === 'present') {
      setShiftStatus('present');
    }
  }, [todayRecord]);

  // Live timer for elapsed duration while checked in
  useEffect(() => {
    if (isCheckedIn && !isCheckedOut && todayRecord?.check_in_time) {
      const checkInMs = new Date(todayRecord.check_in_time).getTime();
      const updateTimer = () => {
        const diffSecs = Math.max(0, Math.floor((Date.now() - checkInMs) / 1000));
        setElapsedSeconds(diffSecs);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else if (todayRecord?.total_minutes) {
      setElapsedSeconds((todayRecord.total_minutes || 0) * 60);
    }
  }, [isCheckedIn, isCheckedOut, todayRecord]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatTimestamp = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(isoString));
  };

  const handleCheckIn = async () => {
    if (!isDeviceApproved) {
      setErrorMsg('Attendance check-in requires an approved office laptop.');
      return;
    }

    setIsOperating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await DeviceAuthManager.performCheckIn(employeeId, notes, shiftStatus);
      if (res.success) {
        setSuccessMsg(
          shiftStatus === 'half_day'
            ? 'Half-day check-in logged successfully!'
            : 'Check-in logged successfully!'
        );
        setNotes('');
        onRefresh();
      } else {
        setErrorMsg(res.message || 'Check-in failed');
      }
    } catch (err: any) {
      console.error('Check-in error:', err);
      setErrorMsg(err.message || 'Check-in operation failed');
    } finally {
      setIsOperating(false);
    }
  };

  const handleCheckOut = async () => {
    if (!isDeviceApproved) {
      setErrorMsg('Attendance check-out requires an approved office laptop.');
      return;
    }

    setIsOperating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await DeviceAuthManager.performCheckOut(employeeId, notes, shiftStatus);
      if (res.success) {
        setSuccessMsg(
          shiftStatus === 'half_day'
            ? 'Half-day check-out logged successfully. Have a good rest of your day!'
            : 'Check-out logged successfully. Have a great evening!'
        );
        setNotes('');
        onRefresh();
      } else {
        setErrorMsg(res.message || 'Check-out failed');
      }
    } catch (err: any) {
      console.error('Check-out error:', err);
      setErrorMsg(err.message || 'Check-out operation failed');
    } finally {
      setIsOperating(false);
    }
  };

  return (
    <div className="glass-dark border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      {/* Messages */}
      {errorMsg && (
        <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Device Requirement Guard Banner */}
      {!isDeviceApproved && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold">
                {!device
                  ? 'Office Laptop Enrollment Required'
                  : device.status === 'pending'
                  ? 'Awaiting Administrator Laptop Approval'
                  : 'Laptop Access Revoked'}
              </div>
              <div className="text-[11px] text-slate-300">
                {!device
                  ? 'You must register this office laptop before checking in.'
                  : device.status === 'pending'
                  ? 'Your administrator has been notified to verify and approve this workstation.'
                  : `Revocation Reason: ${device.revocation_reason || 'Administrative policy'}`}
              </div>
            </div>
          </div>

          {!device && (
            <button
              onClick={onOpenRegisterModal}
              className="px-3.5 py-1.5 rounded-lg bg-pu-gold text-pu-navy font-bold text-xs hover:bg-amber-400 transition-colors shrink-0"
            >
              Enroll Workstation
            </button>
          )}
        </div>
      )}

      {/* Status Hero Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Status indicator */}
        <div className="p-5 rounded-2xl glass-subtle border border-white/10 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Attendance Status
          </span>
          <div className="mt-3 flex items-center gap-2.5">
            {isCheckedOut ? (
              <>
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-base font-bold text-white">
                    {todayRecord?.status === 'half_day' ? 'Half Day' : 'Completed'}
                  </div>
                  <div className="text-xs text-emerald-400">
                    {todayRecord?.status === 'half_day' ? 'Half day finalized' : 'Full day finalized'}
                  </div>
                </div>
              </>
            ) : isCheckedIn ? (
              <>
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 animate-pulse">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-base font-bold text-white">
                    {todayRecord?.status === 'half_day' ? 'Half Day Active' : 'Checked In'}
                  </div>
                  <div className="text-xs text-blue-400">
                    {todayRecord?.status === 'half_day' ? '0.5 day shift' : 'Full day shift'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 rounded-xl bg-slate-700/40 text-slate-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-base font-bold text-white">Not Checked In</div>
                  <div className="text-xs text-slate-400">Pending arrival</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Working Duration Timer */}
        <div className="p-5 rounded-2xl glass-subtle border border-white/10 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-pu-gold" />
            <span>Working Duration</span>
          </span>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {formatTimer(elapsedSeconds)}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {isCheckedOut
                ? `Total: ${Math.floor(elapsedSeconds / 3600)} hrs ${Math.floor(
                    (elapsedSeconds % 3600) / 60
                  )} mins`
                : isCheckedIn
                ? 'Time tracking active'
                : 'Awaiting check-in'}
            </div>
          </div>
        </div>

        {/* Today's Timestamps */}
        <div className="p-5 rounded-2xl glass-subtle border border-white/10 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Shift Log (IST)
          </span>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Check-in:</span>
              </span>
              <span className="font-mono font-bold text-white">
                {formatTimestamp(todayRecord?.check_in_time)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5 text-amber-400" />
                <span>Check-out:</span>
              </span>
              <span className="font-mono font-bold text-white">
                {formatTimestamp(todayRecord?.check_out_time)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Type Selector (Full Day vs Half Day) */}
      {!isCheckedOut && (
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Shift Mode:</span>
              <span className={shiftStatus === 'half_day' ? 'text-amber-400' : 'text-emerald-400'}>
                {shiftStatus === 'half_day' ? 'Half Day (0.5 Payable Day)' : 'Full Day (1.0 Payable Day)'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Select your schedule mode for today's attendance calculation
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isOperating || !isDeviceApproved}
              onClick={() => setShiftStatus('present')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                shiftStatus === 'present'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                  : 'bg-black/30 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              Full Day (1.0)
            </button>
            <button
              type="button"
              disabled={isOperating || !isDeviceApproved}
              onClick={() => setShiftStatus('half_day')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                shiftStatus === 'half_day'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                  : 'bg-black/30 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              Half Day (0.5)
            </button>
          </div>
        </div>
      )}

      {/* Notes Input Field */}
      {!isCheckedOut && (
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Daily Work Notes (Optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Completed 45 student counseling calls, scheduled 8 follow-ups"
            disabled={isOperating || !isDeviceApproved}
            className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pu-gold transition-colors disabled:opacity-50"
          />
        </div>
      )}

      {/* Operational Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {!isCheckedIn && (
          <button
            onClick={handleCheckIn}
            disabled={isOperating || !isDeviceApproved}
            className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
          >
            {isOperating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying Cryptographic Credentials...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Record Check In (Office Laptop)</span>
              </>
            )}
          </button>
        )}

        {isCheckedIn && !isCheckedOut && (
          <button
            onClick={handleCheckOut}
            disabled={isOperating || !isDeviceApproved}
            className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
          >
            {isOperating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying Cryptographic Credentials...</span>
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5" />
                <span>Record Check Out (Office Laptop)</span>
              </>
            )}
          </button>
        )}

        {isCheckedOut && (
          <div className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Today's attendance is fully finalized. Next check-in opens tomorrow.</span>
          </div>
        )}
      </div>
    </div>
  );
};

