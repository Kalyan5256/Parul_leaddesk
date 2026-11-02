import React, { useState } from 'react';
import { Laptop, ShieldCheck, X, AlertTriangle, Loader2 } from 'lucide-react';
import { DeviceAuthManager } from '../../lib/deviceAuth';

interface DeviceRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeviceRegistrationModal: React.FC<DeviceRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [deviceName, setDeviceName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setErrorMsg('Please enter a descriptive name for this office laptop.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await DeviceAuthManager.registerCurrentLaptop(deviceName);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Registration failed:', err);
      setErrorMsg(
        err.message ||
          'Failed to register office laptop. Please ensure you are using a modern browser on an authorized desktop/laptop.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-dark border border-white/20 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-pu-gold/20 text-pu-gold border border-pu-gold/30">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Register Office Laptop</h3>
            <p className="text-xs text-slate-400">
              Hardware-bound cryptographic device enrollment
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Office Laptop Label / Desk Identifier <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Desk 04 - Admissions ThinkPad"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pu-gold transition-colors"
              disabled={isSubmitting}
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Give this workstation a clear name so your Administrator can recognize and approve it.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-blue-300">
              <ShieldCheck className="w-4 h-4" />
              <span>How Office Laptop Security Works</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
              <li>Generates an asymmetric keypair inside your office laptop's secure keystore.</li>
              <li>The private key never leaves this browser and cannot be exported.</li>
              <li>Attendance can only be logged from this physical laptop after Admin approval.</li>
              <li>Mobile devices and personal laptops are strictly prohibited.</li>
            </ul>
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
              disabled={isSubmitting || !deviceName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pu-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-pu-navy font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Keypair...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit for Admin Approval</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

