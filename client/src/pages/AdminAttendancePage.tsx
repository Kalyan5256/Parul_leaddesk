import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import {
  AttendanceRecord,
  EmployeeDevice,
  MonthlyAttendanceReport,
  AttendanceAuditLog,
} from '../types/attendance';
import { AttendanceCorrectionModal } from '../components/attendance/AttendanceCorrectionModal';
import { DeviceRevocationModal } from '../components/attendance/DeviceRevocationModal';
import {
  Calendar,
  Laptop,
  FileSpreadsheet,
  History,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Search,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Clock,
  RefreshCw,
  FileText,
} from 'lucide-react';

type AdminTab = 'daily' | 'devices' | 'reports' | 'audit';

export const AdminAttendancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('daily');

  // Daily View State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
  });
  const [dailyRecords, setDailyRecords] = useState<AttendanceRecord[]>([]);
  const [missingCheckouts, setMissingCheckouts] = useState<AttendanceRecord[]>([]);
  const [showMissingOnly, setShowMissingOnly] = useState<boolean>(false);
  const [dailySearch, setDailySearch] = useState<string>('');

  // Device Management State
  const [devices, setDevices] = useState<EmployeeDevice[]>([]);
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [deviceSearch, setDeviceSearch] = useState<string>('');

  // Monthly Report & Export State
  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthlyReport, setMonthlyReport] = useState<MonthlyAttendanceReport | null>(null);
  const [exportView, setExportView] = useState<'summary' | 'salary' | 'daily' | 'employee'>('summary');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx');
  const [selectedEmployeeForExport, setSelectedEmployeeForExport] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AttendanceAuditLog[]>([]);

  // Modals State
  const [correctionTarget, setCorrectionTarget] = useState<AttendanceRecord | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [revocationTarget, setRevocationTarget] = useState<EmployeeDevice | null>(null);
  const [isRevocationModalOpen, setIsRevocationModalOpen] = useState<boolean>(false);

  // Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --- FETCHING DATA ---

  const loadDailyData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dailyRes, missingRes] = await Promise.all([
        api.get('/attendance/admin/daily', { date: selectedDate }),
        api.get('/attendance/admin/missing-checkouts'),
      ]);

      if (dailyRes.success && Array.isArray(dailyRes.data)) {
        setDailyRecords(dailyRes.data);
      }
      if (missingRes.success && Array.isArray(missingRes.data)) {
        setMissingCheckouts(missingRes.data);
      }
    } catch (e) {
      console.warn('Error loading daily attendance:', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/attendance/admin/devices', {
        status: deviceFilter === 'all' ? undefined : deviceFilter,
      });
      if (res.success && Array.isArray(res.data)) {
        setDevices(res.data);
      }
    } catch (e) {
      console.warn('Error loading devices:', e);
    } finally {
      setIsLoading(false);
    }
  }, [deviceFilter]);

  const loadMonthlyReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/attendance/admin/monthly-report', { month: reportMonth });
      if (res.success && res.data) {
        setMonthlyReport(res.data);
      }
    } catch (e) {
      console.warn('Error loading monthly report:', e);
    } finally {
      setIsLoading(false);
    }
  }, [reportMonth]);

  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/attendance/admin/audit-logs');
      if (res.success && Array.isArray(res.data)) {
        setAuditLogs(res.data);
      }
    } catch (e) {
      console.warn('Error loading audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') loadDailyData();
    if (activeTab === 'devices') loadDevices();
    if (activeTab === 'reports') loadMonthlyReport();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, loadDailyData, loadDevices, loadMonthlyReport, loadAuditLogs]);

  // --- ACTIONS ---

  const handleApproveDevice = async (device: EmployeeDevice) => {
    if (!window.confirm(`Approve office laptop "${device.device_name}" for ${device.employee_name}?`)) {
      return;
    }

    try {
      const res = await api.patch(`/attendance/admin/devices/${device.id}/approve`);
      if (res.success) {
        loadDevices();
      } else {
        alert(res.message || 'Approval failed');
      }
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleExportDownload = async () => {
    setIsExporting(true);
    try {
      const filename = `attendance-${exportView}-${reportMonth}.${exportFormat}`;
      const queryParams: Record<string, string> = {
        format: exportFormat,
        view: exportView,
        month: reportMonth,
        date: selectedDate,
      };

      if (exportView === 'employee' && selectedEmployeeForExport) {
        queryParams.employeeId = selectedEmployeeForExport;
      }

      if (exportFormat === 'csv') {
        await api.downloadCsv('/attendance/admin/export', filename, queryParams);
      } else {
        // Excel and PDF binary downloads
        const searchParams = new URLSearchParams(queryParams);
        const url = `/attendance/admin/export?${searchParams.toString()}`;
        await api.downloadExcel(url, filename);
      }
    } catch (err: any) {
      alert(err.message || 'Export download failed');
    } finally {
      setIsExporting(false);
    }
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '-';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(isoString));
  };

  const formatMinutes = (mins: number) => {
    if (!mins || mins <= 0) return '0 hrs 0 mins';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  // Filtered daily list
  const displayedDailyRecords = (showMissingOnly ? missingCheckouts : dailyRecords).filter(
    (r) =>
      r.employee_name?.toLowerCase().includes(dailySearch.toLowerCase()) ||
      r.device_name?.toLowerCase().includes(dailySearch.toLowerCase())
  );

  // Filtered devices list
  const displayedDevices = devices.filter(
    (d) =>
      d.employee_name?.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      d.device_name?.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      d.device_fingerprint?.toLowerCase().includes(deviceSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-pu-gold/20 text-pu-gold border border-pu-gold/30">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <span>Attendance Administration Desk</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Office workstation authentication, daily shift oversight, audit logs, and payroll exports
          </p>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'daily') loadDailyData();
            if (activeTab === 'devices') loadDevices();
            if (activeTab === 'reports') loadMonthlyReport();
            if (activeTab === 'audit') loadAuditLogs();
          }}
          className="p-2.5 rounded-xl glass-subtle border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-dark border border-white/10 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'daily'
              ? 'bg-gradient-to-r from-pu-gold to-amber-500 text-pu-navy shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Daily Oversight</span>
          {missingCheckouts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
              {missingCheckouts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'devices'
              ? 'bg-gradient-to-r from-pu-gold to-amber-500 text-pu-navy shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Office Laptops</span>
          {devices.filter((d) => d.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-pu-navy">
              {devices.filter((d) => d.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-gradient-to-r from-pu-gold to-amber-500 text-pu-navy shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Monthly Reports & Exports</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-gradient-to-r from-pu-gold to-amber-500 text-pu-navy shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit History</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY OVERSIGHT                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl glass-dark border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Date:
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-pu-gold"
                />
              </div>

              <button
                onClick={() => setShowMissingOnly(!showMissingOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  showMissingOnly
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Missing Checkouts Only ({missingCheckouts.length})</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={dailySearch}
                onChange={(e) => setDailySearch(e.target.value)}
                placeholder="Search staff or laptop..."
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pu-gold"
              />
            </div>
          </div>

          {/* Missing Checkouts Alert Notice */}
          {missingCheckouts.length > 0 && !showMissingOnly && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-300">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold">Missing Check-outs Alert: </span>
                  {missingCheckouts.length} employee record(s) from past dates checked in but never checked out.
                </div>
              </div>
              <button
                onClick={() => setShowMissingOnly(true)}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shrink-0"
              >
                Review Missing
              </button>
            </div>
          )}

          {/* Daily Table */}
          <div className="glass-dark border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-black/40 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Workstation</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes / Reason</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedDailyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                        No attendance records found for this criteria.
                      </td>
                    </tr>
                  ) : (
                    displayedDailyRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          {r.employee_name || 'Staff'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {r.attendance_date}
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
                          <Laptop className="w-3.5 h-3.5 text-slate-400" />
                          <span>{r.device_name || 'Office Laptop'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              r.status === 'present'
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                : r.status === 'half_day'
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : r.status === 'leave'
                                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {r.status === 'present'
                              ? 'Full Day'
                              : r.status === 'half_day'
                              ? 'Half Day (0.5)'
                              : r.status === 'leave'
                              ? 'Leave'
                              : r.status || 'Absent'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400 max-w-[200px] truncate">
                          {r.is_corrected ? (
                            <span className="text-amber-300">
                              Corrected: {r.correction_reason}
                            </span>
                          ) : (
                            r.notes || '-'
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setCorrectionTarget(r);
                              setIsCorrectionModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] border border-amber-500/30 transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Correct</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REGISTERED OFFICE LAPTOPS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl glass-dark border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status:
              </span>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                {['all', 'pending', 'approved', 'revoked'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setDeviceFilter(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                      deviceFilter === s
                        ? 'bg-pu-gold text-pu-navy'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                placeholder="Search staff, label, or fingerprint..."
                className="w-full sm:w-72 pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-pu-gold"
              />
            </div>
          </div>

          {/* Devices Table */}
          <div className="glass-dark border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-black/40 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Workstation Label</th>
                    <th className="py-3 px-4">Key Fingerprint</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4">Last Attendance</th>
                    <th className="py-3 px-4">Approved / Revoked Info</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedDevices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                        No registered devices found.
                      </td>
                    </tr>
                  ) : (
                    displayedDevices.map((d) => (
                      <tr key={d.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          {d.employee_name || 'Staff'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                            <Laptop className="w-4 h-4 text-pu-gold shrink-0" />
                            <span>{d.device_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {d.device_fingerprint || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          {d.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Approved</span>
                            </span>
                          )}
                          {d.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          )}
                          {d.status === 'revoked' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Revoked</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {new Date(d.registered_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {d.last_used_at ? formatTime(d.last_used_at) : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-400">
                          {d.status === 'revoked' ? (
                            <span className="text-rose-300">
                              Revoked: {d.revocation_reason || 'Admin action'}
                            </span>
                          ) : d.status === 'approved' ? (
                            <span className="text-emerald-300">
                              Approved by {d.approved_by_name || 'Admin'}
                            </span>
                          ) : (
                            <span>Awaiting review</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {d.status === 'pending' && (
                              <button
                                onClick={() => handleApproveDevice(d)}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                              >
                                Approve
                              </button>
                            )}

                            {d.status === 'approved' && (
                              <button
                                onClick={() => {
                                  setRevocationTarget(d);
                                  setIsRevocationModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs border border-rose-500/30 transition-colors"
                              >
                                Revoke
                              </button>
                            )}

                            {d.status === 'revoked' && (
                              <button
                                onClick={() => handleApproveDevice(d)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/30 transition-colors"
                              >
                                Re-approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MONTHLY REPORTS & EXPORTS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Export Controls Header */}
          <div className="p-6 rounded-2xl glass-dark border border-white/10 space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-pu-gold" />
                  <span>Monthly Attendance & Salary Export</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calendar-month attendance aggregations with automated duration computation
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Report Month:
                  </span>
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-pu-gold"
                  />
                </div>
              </div>
            </div>

            {/* Export Configuration Controls */}
            <div className="pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Report Scope / View
                </label>
                <select
                  value={exportView}
                  onChange={(e) => setExportView(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-pu-gold"
                >
                  <option value="summary">1. All Staff Monthly Summary</option>
                  <option value="salary">2. Salary-Processing Attendance Sheet</option>
                  <option value="daily">3. Daily Attendance Log (Selected Date)</option>
                  <option value="employee">4. Individual Staff Monthly Report</option>
                </select>
              </div>

              {exportView === 'employee' && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Select Staff Member
                  </label>
                  <select
                    value={selectedEmployeeForExport}
                    onChange={(e) => setSelectedEmployeeForExport(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-pu-gold"
                  >
                    <option value="">Choose Employee...</option>
                    {monthlyReport?.summaries.map((s) => (
                      <option key={s.employee_id} value={s.employee_id}>
                        {s.employee_name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Export File Format
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-pu-gold"
                >
                  <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                  <option value="csv">Comma-Separated Values (.csv)</option>
                  <option value="pdf">Formatted PDF Document (.pdf)</option>
                </select>
              </div>

              <div>
                <button
                  onClick={handleExportDownload}
                  disabled={isExporting || (exportView === 'employee' && !selectedEmployeeForExport)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-pu-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-pu-navy font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Generating...' : `Export ${exportFormat.toUpperCase()}`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Monthly Aggregation Table */}
          <div className="glass-dark border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-black/40 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-center">Days Present</th>
                    <th className="py-3 px-4 text-center">Payable Days (Salary)</th>
                    <th className="py-3 px-4 text-center">Days Absent</th>
                    <th className="py-3 px-4 text-center">Total Working Hours</th>
                    <th className="py-3 px-4 text-center">Avg Daily Hours</th>
                    <th className="py-3 px-4 text-center">Missing Checkouts</th>
                    <th className="py-3 px-4 text-center">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {!monthlyReport || monthlyReport.summaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                        No monthly records found for {reportMonth}.
                      </td>
                    </tr>
                  ) : (
                    monthlyReport.summaries.map((s) => (
                      <tr key={s.employee_id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{s.employee_name}</td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{s.email}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-400">
                          <div>{s.present_days}</div>
                          {s.half_days > 0 && (
                            <div className="text-[10px] text-amber-300 font-normal">
                              incl. {s.half_days} half
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-extrabold text-pu-gold font-mono">
                          {s.payable_days % 1 === 0 ? s.payable_days : s.payable_days.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-center text-rose-300">{s.absent_days}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-200">
                          {s.total_working_hours}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">
                          {s.avg_working_hours}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {s.missing_checkouts > 0 ? (
                            <span className="font-bold text-rose-400">{s.missing_checkouts}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] ${
                              s.attendance_percentage >= 85
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : s.attendance_percentage >= 70
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {s.attendance_percentage}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AUDIT HISTORY                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="glass-dark border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-black/40 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-4">Mandatory Reason / Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                      No attendance audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {formatTime(log.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/10 text-pu-gold border border-white/10">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-white">{log.employee_name}</td>
                      <td className="py-3 px-4 text-slate-300">{log.performed_by_name}</td>
                      <td className="py-3 px-4 text-slate-400 max-w-md">{log.reason || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        record={correctionTarget}
        onClose={() => {
          setIsCorrectionModalOpen(false);
          setCorrectionTarget(null);
        }}
        onSuccess={() => {
          loadDailyData();
        }}
      />

      <DeviceRevocationModal
        isOpen={isRevocationModalOpen}
        device={revocationTarget}
        onClose={() => {
          setIsRevocationModalOpen(false);
          setRevocationTarget(null);
        }}
        onSuccess={() => {
          loadDevices();
        }}
      />
    </div>
  );
};

