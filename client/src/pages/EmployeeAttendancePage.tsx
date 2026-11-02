import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { AttendanceRecord, EmployeeDevice } from '../types/attendance';
import { DeviceAuthManager, isMobileBrowser } from '../lib/deviceAuth';
import { AttendanceClock } from '../components/attendance/AttendanceClock';
import { TodayAttendanceCard } from '../components/attendance/TodayAttendanceCard';
import { EmployeeAttendanceHistory } from '../components/attendance/EmployeeAttendanceHistory';
import { DeviceRegistrationModal } from '../components/attendance/DeviceRegistrationModal';
import { Monitor, Smartphone, ShieldAlert, RefreshCw } from 'lucide-react';

export const EmployeeAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [device, setDevice] = useState<EmployeeDevice | null>(null);
  const [hasLocalKey, setHasLocalKey] = useState<boolean>(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Responsive mobile check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileBrowser() || window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // 1. Check local key
      const local = await DeviceAuthManager.getLocalDeviceMeta();
      setHasLocalKey(Boolean(local?.deviceId));

      // 2. Fetch server device status
      const remoteDevice = await DeviceAuthManager.getRemoteDeviceStatus();
      setDevice(remoteDevice);

      // 3. Fetch today's record
      const todayRes = await api.get('/attendance/today');
      if (todayRes.success) {
        setTodayRecord(todayRes.data || null);
      }
    } catch (e) {
      console.warn('Error loading attendance status:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setIsHistoryLoading(true);
    try {
      const res = await api.get('/attendance/my-history', { month });
      if (res.success && Array.isArray(res.data)) {
        setHistoryRecords(res.data);
      }
    } catch (e) {
      console.warn('Error loading history:', e);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [user, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Mobile View Restriction Screen
  if (isMobile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="glass-dark border border-white/15 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Smartphone className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-extrabold text-white mb-2">Desktop Workstation Only</h2>
          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            Employee attendance check-in and check-out is restricted exclusively to authorized office desktop and laptop computers.
          </p>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs text-slate-300 space-y-2 mb-6">
            <div className="flex items-center gap-2 font-bold text-pu-gold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Office Policy Compliance</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              To guarantee physical office presence and hardware-backed device authorization, mobile check-ins are strictly prohibited.
            </p>
            <p className="text-[11px] text-slate-400 leading-normal">
              Please open Parul Lead Desk on your assigned office laptop to record your attendance.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <Monitor className="w-4 h-4 text-emerald-400" />
            <span>Assigned Office Laptop Required</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-pu-gold/20 text-pu-gold border border-pu-gold/30">
              <Monitor className="w-5 h-5" />
            </span>
            <span>Employee Attendance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered office laptop check-in and shift tracking
          </p>
        </div>

        <button
          onClick={() => {
            loadData();
            loadHistory();
          }}
          className="p-2.5 rounded-xl glass-subtle border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 text-xs font-semibold"
          title="Refresh attendance status"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* 1. Time & Device Status Clock */}
      <AttendanceClock
        device={device}
        hasLocalKey={hasLocalKey}
        onRegisterClick={() => setIsRegisterModalOpen(true)}
      />

      {/* 2. Today's Attendance Operation Card */}
      <TodayAttendanceCard
        employeeId={user?.id || ''}
        device={device}
        todayRecord={todayRecord}
        onRefresh={() => {
          loadData();
          loadHistory();
        }}
        onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
      />

      {/* 3. Monthly Personal History */}
      <EmployeeAttendanceHistory
        records={historyRecords}
        month={month}
        onMonthChange={setMonth}
        isLoading={isHistoryLoading}
      />

      {/* 4. Office Laptop Registration Modal */}
      <DeviceRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
};

