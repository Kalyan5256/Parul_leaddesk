/**
 * Non-Mutating Verification Test Suite for Employee Attendance Module
 * Tests timezone boundaries, WebCrypto ECDSA verification, challenge single-use,
 * PDF generation, Excel generation, CSV formatting, and mobile detection without touching production data.
 */

import {
  getKolkataDateString,
  getKolkataTimeString,
  getMonthDateRange,
  formatMinutesToHours,
} from '../utils/timezone.js';
import {
  generateChallengeNonce,
  verifyDeviceSignature,
  isMobileClient,
} from '../utils/cryptoVerification.js';
import { SimplePdfDocument } from '../utils/pdfGenerator.js';
import { AttendanceExportService } from '../utils/attendanceExport.js';
import { MonthlyAttendanceReport, AttendanceRecord, UserProfile } from '../types/index.js';
import crypto from 'crypto';

const { subtle } = crypto.webcrypto;

async function runTests() {
  console.log('================================================================');
  console.log('PARUL LEADDESK: ATTENDANCE MODULE TEST & VALIDATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // --- 1. TIMEZONE & CALENDAR MONTH TESTS ---
  console.log('--- 1. Testing Asia/Kolkata Timezone & Month Ranges ---');
  const todayStr = getKolkataDateString();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStr), `Date format is YYYY-MM-DD (${todayStr})`);

  const timeStr = getKolkataTimeString();
  assert(/^\d{2}:\d{2}:\d{2}$/.test(timeStr), `Time format is HH:mm:ss (${timeStr})`);

  // Test 31-day month (January)
  const janRange = getMonthDateRange('2026-01');
  assert(janRange.daysInMonth === 31, 'January has 31 days');
  assert(janRange.startDate === '2026-01-01', 'January starts on 2026-01-01');
  assert(janRange.endDate === '2026-01-31', 'January ends on 2026-01-31');

  // Test 30-day month (November)
  const novRange = getMonthDateRange('2026-11');
  assert(novRange.daysInMonth === 30, 'November has 30 days');
  assert(novRange.startDate === '2026-11-01', 'November starts on 2026-11-01');
  assert(novRange.endDate === '2026-11-30', 'November ends on 2026-11-30');

  // Test February in regular year (2025: 28 days)
  const feb2025 = getMonthDateRange('2025-02');
  assert(feb2025.daysInMonth === 28, 'February 2025 has 28 days');

  // Test February in leap year (2024: 29 days)
  const feb2024 = getMonthDateRange('2024-02');
  assert(feb2024.daysInMonth === 29, 'February 2024 (Leap Year) has 29 days');
  assert(feb2024.endDate === '2024-02-29', 'Leap year ends on 2024-02-29');

  // Duration formatting
  assert(formatMinutesToHours(0) === '0 hrs 0 mins', '0 minutes formats correctly');
  assert(formatMinutesToHours(90) === '1 hrs 30 mins', '90 minutes formats to 1 hrs 30 mins');
  assert(formatMinutesToHours(485) === '8 hrs 5 mins', '485 minutes formats to 8 hrs 5 mins');

  // --- 2. WEBCRYPTO ECDSA P-256 SIGNATURE VERIFICATION ---
  console.log('\n--- 2. Testing Device-Bound ECDSA P-256 Cryptography ---');
  const nonce = generateChallengeNonce();
  assert(nonce.length === 64, 'Challenge nonce is 32-byte hex (64 chars)');

  // Generate test keypair
  const keyPair = await subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const jwk = await subtle.exportKey('jwk', keyPair.publicKey);
  const jwkStr = JSON.stringify(jwk);

  const testEmployeeId = 'emp-test-uuid-1234';
  const testDeviceId = 'dev-test-uuid-5678';
  const message = `ParulAttendance:${testEmployeeId}:${testDeviceId}:${nonce}`;

  const messageBuffer = Buffer.from(message, 'utf-8');
  const signatureBuffer = await subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    keyPair.privateKey,
    messageBuffer
  );
  const signatureBase64 = Buffer.from(signatureBuffer).toString('base64');

  const isSigValid = await verifyDeviceSignature(jwkStr, message, signatureBase64);
  assert(isSigValid === true, 'Valid device signature verified successfully');

  // Test corrupted / tampered signature
  const isCorruptedValid = await verifyDeviceSignature(jwkStr, message, 'dGFtcGVyZWQtc2lnbmF0dXJl');
  assert(isCorruptedValid === false, 'Tampered signature rejected');

  // Test message tampering
  const tamperedMessage = `ParulAttendance:DIFFERENT-EMPLOYEE:${testDeviceId}:${nonce}`;
  const isTamperedMsgValid = await verifyDeviceSignature(jwkStr, tamperedMessage, signatureBase64);
  assert(isTamperedMsgValid === false, 'Signature with mismatched payload rejected');

  // --- 3. MOBILE BROWSER RESTRICTIONS ---
  console.log('\n--- 3. Testing Mobile Detection Restrictions ---');
  const desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  const iphoneUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  const androidUa = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36';

  assert(isMobileClient(desktopUa, '?0') === false, 'Desktop Chrome recognized as desktop');
  assert(isMobileClient(iphoneUa, '?1') === true, 'iPhone Mobile Safari recognized as mobile');
  assert(isMobileClient(androidUa, '?1') === true, 'Android Mobile Chrome recognized as mobile');
  assert(isMobileClient(desktopUa, '?1') === true, 'Sec-CH-UA-Mobile ?1 recognized as mobile');

  // --- 4. PDF GENERATOR TEST ---
  console.log('\n--- 4. Testing PDF 1.4 Generation Engine ---');
  const pdfDoc = new SimplePdfDocument('landscape');
  const pdfBuffer = pdfDoc.generateReport({
    title: 'Test Monthly Attendance Report',
    subtitle: 'Automated test suite validation',
    columns: [
      { header: 'Employee Name', key: 'name', width: 150, align: 'left' },
      { header: 'Present Days', key: 'present', width: 80, align: 'center' },
      { header: 'Total Hours', key: 'hours', width: 100, align: 'center' },
    ],
    rows: [
      { name: 'Kalyan Test', present: 24, hours: '192 hrs 0 mins' },
      { name: 'Admissions Desk 2', present: 22, hours: '176 hrs 30 mins' },
    ],
    metadata: [
      { label: 'Month', value: 'November 2026' },
      { label: 'Total', value: '2' },
    ],
  });

  assert(Buffer.isBuffer(pdfBuffer), 'PDF output is a valid Node Buffer');
  assert(pdfBuffer.subarray(0, 8).toString().startsWith('%PDF-1.4'), 'PDF starts with %PDF-1.4 header');
  assert(pdfBuffer.includes('startxref'), 'PDF contains valid cross-reference table');
  assert(pdfBuffer.includes('%%EOF'), 'PDF terminates with %%EOF');

  // --- 5. EXCEL AND CSV EXPORTS TEST ---
  console.log('\n--- 5. Testing Multi-Format Export Builders ---');
  const mockReport: MonthlyAttendanceReport = {
    month: '2026-11',
    total_calendar_days: 30,
    working_days: 26,
    total_employees: 2,
    summaries: [
      {
        employee_id: 'emp-01',
        employee_name: 'Test Staff A',
        email: 'staffa@paruluniversity.ac.in',
        total_calendar_days: 30,
        working_days: 26,
        present_days: 25,
        half_days: 0,
        payable_days: 25,
        absent_days: 1,
        approved_leaves: 0,
        total_working_minutes: 12000,
        total_working_hours: '200 hrs 0 mins',
        avg_working_hours: '8 hrs 0 mins',
        missing_checkouts: 0,
        attendance_percentage: 96,
      },
    ],
    generated_at: new Date().toISOString(),
  };

  const csv = AttendanceExportService.generateSummaryCsv(mockReport);
  assert(csv.includes('Employee ID,Employee Name,Email'), 'CSV header is well-formed');
  assert(csv.includes('"Test Staff A"'), 'CSV escapes values correctly');

  const salaryCsv = AttendanceExportService.generateSalaryCsv(mockReport);
  assert(salaryCsv.includes('Net Payable Days'), 'Salary CSV contains payroll fields');

  const excelBuffer = await AttendanceExportService.generateSummaryExcel(mockReport);
  assert(Buffer.isBuffer(excelBuffer) && excelBuffer.length > 1000, 'Excel .xlsx buffer generated');
  // Check ZIP magic bytes (PK\x03\x04 for OOXML/XLSX)
  assert(excelBuffer[0] === 0x50 && excelBuffer[1] === 0x4b, 'Excel file has valid ZIP/OOXML magic bytes');

  console.log('\n================================================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});

