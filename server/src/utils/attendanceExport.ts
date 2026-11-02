import ExcelJS from 'exceljs';
import { SimplePdfDocument, PdfTableColumn } from './pdfGenerator.js';
import { MonthlyAttendanceReport, AttendanceRecord, UserProfile } from '../types/index.js';
import { getKolkataFormattedDateTime, formatMinutesToHours } from './timezone.js';

// --- CSV FORMATTING HELPER ---
const escapeCsv = (val: any): string => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

export class AttendanceExportService {
  /**
   * 1. ALL EMPLOYEES MONTHLY SUMMARY
   */
  static generateSummaryCsv(report: MonthlyAttendanceReport): string {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Email',
      'Month',
      'Calendar Days',
      'Working Days',
      'Present Days',
      'Absent Days',
      'Approved Leaves',
      'Total Working Hours',
      'Average Daily Hours',
      'Missing Checkouts',
      'Attendance %',
    ];

    const rows = report.summaries.map((s) => [
      escapeCsv(s.employee_id),
      escapeCsv(s.employee_name),
      escapeCsv(s.email),
      escapeCsv(report.month),
      escapeCsv(s.total_calendar_days),
      escapeCsv(s.working_days),
      escapeCsv(s.present_days),
      escapeCsv(s.absent_days),
      escapeCsv(s.approved_leaves),
      escapeCsv(s.total_working_hours),
      escapeCsv(s.avg_working_hours),
      escapeCsv(s.missing_checkouts),
      escapeCsv(`${s.attendance_percentage}%`),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static async generateSummaryExcel(report: MonthlyAttendanceReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Parul University Lead Desk';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Monthly Attendance Summary', {
      views: [{ showGridLines: true }],
    });

    // Title Row
    sheet.mergeCells('A1:M1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'PARUL UNIVERSITY  —  EMPLOYEE ATTENDANCE MONTHLY SUMMARY';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF152238' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Subtitle Row
    sheet.mergeCells('A2:M2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Month: ${report.month}  |  Calendar Days: ${report.total_calendar_days}  |  Working Days: ${report.working_days}  |  Generated: ${getKolkataFormattedDateTime()}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // Column Headers
    const headers = [
      'Employee ID',
      'Employee Name',
      'Email',
      'Calendar Days',
      'Working Days',
      'Present Days',
      'Absent Days',
      'Approved Leaves',
      'Total Working Hours',
      'Average Daily Hours',
      'Missing Checkouts',
      'Attendance %',
    ];

    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF152238' }, // Navy
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF999999' } },
        bottom: { style: 'thin', color: { argb: 'FF999999' } },
        left: { style: 'thin', color: { argb: 'FF999999' } },
        right: { style: 'thin', color: { argb: 'FF999999' } },
      };
    });

    // Data rows
    report.summaries.forEach((s, idx) => {
      const row = sheet.addRow([
        s.employee_id,
        s.employee_name,
        s.email,
        s.total_calendar_days,
        s.working_days,
        s.present_days,
        s.absent_days,
        s.approved_leaves,
        s.total_working_hours,
        s.avg_working_hours,
        s.missing_checkouts,
        `${s.attendance_percentage}%`,
      ]);

      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNum <= 3 ? 'left' : 'center',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8F9FA' },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      });
    });

    // Auto-fit column widths
    sheet.columns = [
      { width: 36 }, // ID
      { width: 25 }, // Name
      { width: 28 }, // Email
      { width: 14 }, // Calendar Days
      { width: 14 }, // Working Days
      { width: 14 }, // Present Days
      { width: 14 }, // Absent Days
      { width: 16 }, // Approved Leaves
      { width: 20 }, // Total Hours
      { width: 18 }, // Avg Hours
      { width: 18 }, // Missing Checkouts
      { width: 15 }, // Attendance %
    ];

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  static generateSummaryPdf(report: MonthlyAttendanceReport): Buffer {
    const doc = new SimplePdfDocument('landscape');
    const columns: PdfTableColumn[] = [
      { header: 'Employee Name', key: 'employee_name', width: 130, align: 'left' },
      { header: 'Email', key: 'email', width: 140, align: 'left' },
      { header: 'Present', key: 'present_days', width: 50, align: 'center' },
      { header: 'Absent', key: 'absent_days', width: 50, align: 'center' },
      { header: 'Leaves', key: 'approved_leaves', width: 50, align: 'center' },
      { header: 'Total Hours', key: 'total_working_hours', width: 85, align: 'center' },
      { header: 'Avg Hours', key: 'avg_working_hours', width: 75, align: 'center' },
      { header: 'Missing CO', key: 'missing_checkouts', width: 65, align: 'center' },
      { header: 'Attendance %', key: 'attendance_percentage_str', width: 75, align: 'center' },
    ];

    const rows = report.summaries.map((s) => ({
      ...s,
      attendance_percentage_str: `${s.attendance_percentage}%`,
    }));

    return doc.generateReport({
      title: 'Monthly Employee Attendance Summary',
      subtitle: 'Complete monthly attendance log and compliance overview for all staff',
      metadata: [
        { label: 'Month', value: report.month },
        { label: 'Total Employees', value: String(report.total_employees) },
        { label: 'Calendar Days', value: String(report.total_calendar_days) },
        { label: 'Generated', value: getKolkataFormattedDateTime() },
      ],
      columns,
      rows,
      orientation: 'landscape',
    });
  }

  /**
   * 2. SALARY PROCESSING ATTENDANCE SHEET
   */
  static generateSalaryCsv(report: MonthlyAttendanceReport): string {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Email',
      'Month',
      'Calendar Days',
      'Full Days',
      'Half Days',
      'Paid Leaves',
      'Net Payable Days',
      'Absent Days (Deductible)',
      'Total Working Hours',
      'Average Daily Hours',
      'Missing Checkouts (Audit Flag)',
    ];

    const rows = report.summaries.map((s) => [
      escapeCsv(s.employee_id),
      escapeCsv(s.employee_name),
      escapeCsv(s.email),
      escapeCsv(report.month),
      escapeCsv(s.total_calendar_days),
      escapeCsv(Math.max(0, s.present_days - (s.half_days || 0))),
      escapeCsv(s.half_days || 0),
      escapeCsv(s.approved_leaves || 0),
      escapeCsv(s.payable_days !== undefined ? s.payable_days : s.present_days),
      escapeCsv(s.absent_days),
      escapeCsv(s.total_working_hours),
      escapeCsv(s.avg_working_hours),
      escapeCsv(s.missing_checkouts),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static async generateSalaryExcel(report: MonthlyAttendanceReport): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Parul University Lead Desk';
    const sheet = workbook.addWorksheet('Salary Processing Sheet', {
      views: [{ showGridLines: true }],
    });

    // Title
    sheet.mergeCells('A1:M1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'PARUL UNIVERSITY  —  PAYROLL ATTENDANCE RECORD';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF152238' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 28;

    // Subtitle
    sheet.mergeCells('A2:M2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Salary Period: ${report.month}  |  Calendar Days: ${report.total_calendar_days}  |  Generated for Payroll Department`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 18;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Email',
      'Calendar Days',
      'Full Days',
      'Half Days',
      'Paid Leaves',
      'Payable Days',
      'Absent Days',
      'Total Hours',
      'Avg Daily Hours',
      'Missing Checkouts',
      'HR Status',
    ];

    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }, // Rich Dark Blue
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF999999' } },
        bottom: { style: 'thin', color: { argb: 'FF999999' } },
        left: { style: 'thin', color: { argb: 'FF999999' } },
        right: { style: 'thin', color: { argb: 'FF999999' } },
      };
    });

    report.summaries.forEach((s, idx) => {
      const fullDays = Math.max(0, s.present_days - (s.half_days || 0));
      const payableDays = s.payable_days !== undefined ? s.payable_days : s.present_days;

      const row = sheet.addRow([
        s.employee_id,
        s.employee_name,
        s.email,
        s.total_calendar_days,
        fullDays,
        s.half_days || 0,
        s.approved_leaves || 0,
        payableDays,
        s.absent_days,
        s.total_working_hours,
        s.avg_working_hours,
        s.missing_checkouts,
        s.missing_checkouts > 0 ? 'Requires Audit' : 'Verified',
      ]);

      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNum <= 3 ? 'left' : 'center',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF9FAFB' },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    sheet.columns = [
      { width: 36 },
      { width: 24 },
      { width: 28 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 16 },
      { width: 14 },
      { width: 16 },
      { width: 16 },
      { width: 18 },
      { width: 16 },
    ];

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  static generateSalaryPdf(report: MonthlyAttendanceReport): Buffer {
    const doc = new SimplePdfDocument('landscape');
    const columns: PdfTableColumn[] = [
      { header: 'Employee Name', key: 'employee_name', width: 125, align: 'left' },
      { header: 'Email', key: 'email', width: 135, align: 'left' },
      { header: 'Full Days', key: 'full_days_str', width: 50, align: 'center' },
      { header: 'Half Days', key: 'half_days_str', width: 50, align: 'center' },
      { header: 'Leaves', key: 'approved_leaves_str', width: 45, align: 'center' },
      { header: 'Payable Days', key: 'payable_days_str', width: 70, align: 'center' },
      { header: 'Absent', key: 'absent_days', width: 45, align: 'center' },
      { header: 'Total Hours', key: 'total_working_hours', width: 80, align: 'center' },
      { header: 'Missing CO', key: 'missing_checkouts', width: 60, align: 'center' },
      { header: 'HR Status', key: 'hr_status', width: 60, align: 'center' },
    ];

    const rows = report.summaries.map((s) => ({
      ...s,
      full_days_str: String(Math.max(0, s.present_days - (s.half_days || 0))),
      half_days_str: String(s.half_days || 0),
      approved_leaves_str: String(s.approved_leaves || 0),
      payable_days_str: String(s.payable_days !== undefined ? s.payable_days : s.present_days),
      hr_status: s.missing_checkouts > 0 ? 'Review' : 'Verified',
    }));

    return doc.generateReport({
      title: 'Salary Processing Attendance Sheet',
      subtitle: 'Official monthly attendance tally for payroll computation and audit',
      metadata: [
        { label: 'Payroll Period', value: report.month },
        { label: 'Total Staff', value: String(report.total_employees) },
        { label: 'Calendar Days', value: String(report.total_calendar_days) },
        { label: 'Generated', value: getKolkataFormattedDateTime() },
      ],
      columns,
      rows,
      orientation: 'landscape',
    });
  }

  /**
   * 3. INDIVIDUAL EMPLOYEE MONTHLY REPORT
   */
  static generateIndividualCsv(
    employee: UserProfile,
    month: string,
    records: AttendanceRecord[]
  ): string {
    const headers = [
      'Date',
      'Status',
      'Check In Time',
      'Check Out Time',
      'Total Duration',
      'Corrected by Admin',
      'Correction Reason',
      'Notes',
    ];

    const rows = records.map((r) => [
      escapeCsv(r.attendance_date),
      escapeCsv(r.status),
      escapeCsv(r.check_in_time ? getKolkataFormattedDateTime(r.check_in_time) : 'N/A'),
      escapeCsv(r.check_out_time ? getKolkataFormattedDateTime(r.check_out_time) : 'Missing'),
      escapeCsv(formatMinutesToHours(r.total_minutes)),
      escapeCsv(r.is_corrected ? 'Yes' : 'No'),
      escapeCsv(r.correction_reason || ''),
      escapeCsv(r.notes || ''),
    ]);

    const meta = [
      `Employee ID,${escapeCsv(employee.id)}`,
      `Employee Name,${escapeCsv(employee.full_name)}`,
      `Email,${escapeCsv(employee.email)}`,
      `Month,${escapeCsv(month)}`,
      '',
    ].join('\n');

    return meta + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static async generateIndividualExcel(
    employee: UserProfile,
    month: string,
    records: AttendanceRecord[]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Attendance - ${employee.full_name.substring(0, 20)}`, {
      views: [{ showGridLines: true }],
    });

    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `PARUL UNIVERSITY  —  INDIVIDUAL ATTENDANCE RECORD`;
    titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF152238' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 26;

    sheet.mergeCells('A2:G2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Staff: ${employee.full_name} (${employee.email})  |  Month: ${month}  |  Generated: ${getKolkataFormattedDateTime()}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 18;

    const headers = [
      'Date',
      'Status',
      'Check In (IST)',
      'Check Out (IST)',
      'Duration',
      'Is Corrected',
      'Correction Reason / Notes',
    ];

    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF152238' },
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    records.forEach((r, idx) => {
      const row = sheet.addRow([
        r.attendance_date,
        r.status,
        r.check_in_time ? getKolkataFormattedDateTime(r.check_in_time) : '-',
        r.check_out_time ? getKolkataFormattedDateTime(r.check_out_time) : 'Missing',
        formatMinutesToHours(r.total_minutes),
        r.is_corrected ? 'Yes' : 'No',
        r.correction_reason || r.notes || '-',
      ]);

      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNum === 1 || colNum === 2 ? 'center' : 'left',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF9FAFB' },
        };
      });
    });

    sheet.columns = [
      { width: 14 },
      { width: 12 },
      { width: 24 },
      { width: 24 },
      { width: 16 },
      { width: 14 },
      { width: 36 },
    ];

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  static generateIndividualPdf(
    employee: UserProfile,
    month: string,
    records: AttendanceRecord[]
  ): Buffer {
    const doc = new SimplePdfDocument('landscape');
    const columns: PdfTableColumn[] = [
      { header: 'Date', key: 'attendance_date', width: 75, align: 'center' },
      { header: 'Status', key: 'status', width: 65, align: 'center' },
      { header: 'Check In (IST)', key: 'check_in_formatted', width: 140, align: 'left' },
      { header: 'Check Out (IST)', key: 'check_out_formatted', width: 140, align: 'left' },
      { header: 'Duration', key: 'duration_str', width: 90, align: 'center' },
      { header: 'Corrected', key: 'corrected_str', width: 60, align: 'center' },
      { header: 'Notes / Reason', key: 'notes_str', width: 150, align: 'left' },
    ];

    const rows = records.map((r) => ({
      attendance_date: r.attendance_date,
      status: r.status,
      check_in_formatted: r.check_in_time ? getKolkataFormattedDateTime(r.check_in_time) : '-',
      check_out_formatted: r.check_out_time
        ? getKolkataFormattedDateTime(r.check_out_time)
        : 'Missing Check-out',
      duration_str: formatMinutesToHours(r.total_minutes),
      corrected_str: r.is_corrected ? 'Yes' : 'No',
      notes_str: r.correction_reason || r.notes || '-',
    }));

    return doc.generateReport({
      title: `Staff Attendance Record: ${employee.full_name}`,
      subtitle: `Monthly breakdown for ${employee.full_name} (${employee.email})`,
      metadata: [
        { label: 'Month', value: month },
        { label: 'Employee ID', value: employee.id.substring(0, 8) + '...' },
        { label: 'Total Records', value: String(records.length) },
        { label: 'Generated', value: getKolkataFormattedDateTime() },
      ],
      columns,
      rows,
      orientation: 'landscape',
    });
  }

  /**
   * 4. DAILY ATTENDANCE DETAILS
   */
  static generateDailyCsv(date: string, records: AttendanceRecord[]): string {
    const headers = [
      'Date',
      'Employee ID',
      'Employee Name',
      'Status',
      'Check In Time (IST)',
      'Check Out Time (IST)',
      'Total Working Hours',
      'Device Name',
      'Corrected by Admin',
      'Notes',
    ];

    const rows = records.map((r) => [
      escapeCsv(r.attendance_date),
      escapeCsv(r.employee_id),
      escapeCsv(r.employee_name || 'Staff'),
      escapeCsv(r.status),
      escapeCsv(r.check_in_time ? getKolkataFormattedDateTime(r.check_in_time) : 'N/A'),
      escapeCsv(r.check_out_time ? getKolkataFormattedDateTime(r.check_out_time) : 'Missing'),
      escapeCsv(formatMinutesToHours(r.total_minutes)),
      escapeCsv(r.device_name || 'Office Laptop'),
      escapeCsv(r.is_corrected ? 'Yes' : 'No'),
      escapeCsv(r.correction_reason || r.notes || ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static async generateDailyExcel(date: string, records: AttendanceRecord[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Daily Attendance ${date}`, {
      views: [{ showGridLines: true }],
    });

    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `PARUL UNIVERSITY  —  DAILY ATTENDANCE LOG`;
    titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF152238' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 26;

    sheet.mergeCells('A2:I2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Date: ${date}  |  Total Present: ${records.length}  |  Generated: ${getKolkataFormattedDateTime()}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF555555' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 18;

    const headers = [
      'Employee Name',
      'Status',
      'Check In (IST)',
      'Check Out (IST)',
      'Total Duration',
      'Device Used',
      'Is Corrected',
      'Notes / Reason',
    ];

    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF152238' },
      };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    records.forEach((r, idx) => {
      const row = sheet.addRow([
        r.employee_name || 'Staff',
        r.status,
        r.check_in_time ? getKolkataFormattedDateTime(r.check_in_time) : '-',
        r.check_out_time ? getKolkataFormattedDateTime(r.check_out_time) : 'Missing',
        formatMinutesToHours(r.total_minutes),
        r.device_name || 'Office Laptop',
        r.is_corrected ? 'Yes' : 'No',
        r.correction_reason || r.notes || '-',
      ]);

      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNum === 1 || colNum === 2 ? 'center' : 'left',
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF9FAFB' },
        };
      });
    });

    sheet.columns = [
      { width: 25 },
      { width: 14 },
      { width: 24 },
      { width: 24 },
      { width: 16 },
      { width: 22 },
      { width: 14 },
      { width: 30 },
    ];

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  static generateDailyPdf(date: string, records: AttendanceRecord[]): Buffer {
    const doc = new SimplePdfDocument('landscape');
    const columns: PdfTableColumn[] = [
      { header: 'Employee Name', key: 'employee_name_str', width: 130, align: 'left' },
      { header: 'Status', key: 'status', width: 65, align: 'center' },
      { header: 'Check In (IST)', key: 'check_in_formatted', width: 140, align: 'left' },
      { header: 'Check Out (IST)', key: 'check_out_formatted', width: 140, align: 'left' },
      { header: 'Duration', key: 'duration_str', width: 90, align: 'center' },
      { header: 'Device', key: 'device_str', width: 95, align: 'left' },
      { header: 'Notes', key: 'notes_str', width: 110, align: 'left' },
    ];

    const rows = records.map((r) => ({
      employee_name_str: r.employee_name || 'Staff',
      status: r.status,
      check_in_formatted: r.check_in_time ? getKolkataFormattedDateTime(r.check_in_time) : '-',
      check_out_formatted: r.check_out_time
        ? getKolkataFormattedDateTime(r.check_out_time)
        : 'Missing Check-out',
      duration_str: formatMinutesToHours(r.total_minutes),
      device_str: r.device_name || 'Office Laptop',
      notes_str: r.correction_reason || r.notes || '-',
    }));

    return doc.generateReport({
      title: `Daily Attendance Log: ${date}`,
      subtitle: `Master attendance register across all departments for date: ${date}`,
      metadata: [
        { label: 'Date', value: date },
        { label: 'Total Present', value: String(records.length) },
        { label: 'Generated', value: getKolkataFormattedDateTime() },
      ],
      columns,
      rows,
      orientation: 'landscape',
    });
  }
}
