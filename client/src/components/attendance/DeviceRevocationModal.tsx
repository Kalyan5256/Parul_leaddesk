import React, { useState } from 'react';
import { ShieldAlert, X, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { EmployeeDevice } from '../../types/attendance';

interface DeviceRevocationModalProps {
  isOpen: boolean;
  device: EmployeeDevice | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeviceRevocationModal: React.FC<DeviceRevocationModalProps> = ({
  isOpen,
  device,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !device) return null;

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('A revocation reason is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.patch(`/attendance/admin/devices/${device.id}/revoke`, {
        reason: reason.trim(),
      });

      if (!res.success) {
        throw new Error(res.message || 'Revocation failed');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to revoke device');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="glass-dark border border-white/20 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Revoke Office Laptop</h3>
            <p className="text-xs text-slate-400">
              Staff: <span className="text-white font-semibold">{device.employee_name}</span> | Device: <span className="text-rose-300 font-mono">{device.device_name}</span>
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRevoke} className="space-y-4">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            Revoking this device will immediately disable attendance check-in and check-out from this laptop.
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Revocation Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Employee transferred to another desk, laptop replaced with new model, security reallocation"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-rose-500 resize-none"
              disabled={isSubmitting}
              required
              autoFocus
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Revoking...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Confirm Revocation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

