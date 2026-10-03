import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Continue',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
}) => {
  const icon =
    variant === 'primary' ? (
      <div className="p-3 rounded-full bg-blue-500/20 text-sky-400 border border-blue-400/30">
        <Info className="w-6 h-6" />
      </div>
    ) : (
      <div className="p-3 rounded-full bg-amber-500/20 text-amber-400 border border-amber-400/30">
        <AlertTriangle className="w-6 h-6" />
      </div>
    );

  const confirmButtonVariant =
    variant === 'danger' ? 'danger' : variant === 'warning' ? 'primary' : 'primary';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={!isLoading}>
      <div className="flex flex-col items-center text-center">
        {icon}
        <h3 className="text-lg font-bold text-white mt-4">{title}</h3>
        <p className="text-sm text-slate-300 mt-2 leading-relaxed">{message}</p>

        <div className="flex items-center justify-center gap-3 w-full mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={confirmButtonVariant}
            onClick={() => {
              onConfirm();
            }}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
