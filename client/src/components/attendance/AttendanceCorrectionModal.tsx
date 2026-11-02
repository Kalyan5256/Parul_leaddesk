import React, { useState, useEffect } from 'react';
import { Edit3, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { AttendanceRecord } from '../../types/attendance';

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  record: AttendanceRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  isOpen,
  record,
  onClose,
  onSuccess,
}) => {
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [checkOutTime, setCheckOutTime] = useState<string>('');
  const [status, setStatus] = useState<string>('present');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setCheckInTime(record.check_in_time ? record.check_in_time.substring(0, 19) : '');
      setCheckOutTime(record.check_out_time ? record.check_out_time.substring(0, 19) : '');
      setStatus(record.status || 'present');
      setReason('');
      setNotes(record.notes || '');
      setErrorMsg(null);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('A mandatory explanation reason is required for administrative corrections.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.post('/attendance/admin/correct', {
        recordId: record.id,
        check_in_time: checkInTime ? new Date(checkInTime).toISOString() : record.check_in_time,
        check_out_time: checkOutTime ? new Date(checkOutTime).toISOString() : null,
        status,
        notes,
        reason: reason.trim(),
      });

      if (!res.success) {
        throw new Error(res.message || 'Correction failed');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply administrative correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="glass-dark border border-white/20 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Correct Attendance Record</h3>
            <p className="text-xs text-slate-400">
              Staff: <span className="text-white font-semibold">{record.employee_name}</span> |
              Date: <span className="text-pu-gold font-mono">{record.attendance_date}</span>
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Check In Time
              </label>
              <input
                type="datetime-local"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-pu-gold"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Check Out Time
              </label>
              <input
                type="datetime-local"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-pu-gold"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-pu-gold"
              disabled={isSubmitting}
            >
              <option value="present">Present</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
              <option value="leave">Approved Leave</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-rose-300 mb-1 flex items-center justify-between">
              <span>Mandatory Correction Reason *</span>
              <span className="text-[10px] text-slate-400">Logged in audit trail</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Employee forgot to check out due to urgent campus admission event"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-rose-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pu-gold resize-none"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              General Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pu-gold"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-pu-navy font-bold text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply Correction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

