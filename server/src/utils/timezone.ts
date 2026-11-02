/**
 * Asia/Kolkata Timezone & Date Utilities
 * Ensures all attendance records and calendar reporting strictly use IST (UTC+05:30).
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata timezone.
 */
export const getKolkataDateString = (dateInput?: Date | string | number): string => {
  const date = dateInput ? new Date(dateInput) : new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // en-CA yields YYYY-MM-DD
};

/**
 * Returns the current time formatted as HH:mm:ss in Asia/Kolkata timezone (24h).
 */
export const getKolkataTimeString = (dateInput?: Date | string | number): string => {
  const date = dateInput ? new Date(dateInput) : new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
};

/**
 * Returns a human-readable timestamp in Asia/Kolkata (e.g. "02 Nov 2026, 05:30 PM IST").
 */
export const getKolkataFormattedDateTime = (dateInput?: Date | string | number): string => {
  const date = dateInput ? new Date(dateInput) : new Date();
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  return `${formatter.format(date)} IST`;
};

/**
 * Calculates calendar month date boundaries and date list.
 * Automatically handles 28, 29, 30, and 31-day months and leap years.
 * @param yearMonth Format: "YYYY-MM"
 */
export const getMonthDateRange = (yearMonth: string) => {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    throw new Error(`Invalid yearMonth format: "${yearMonth}". Expected "YYYY-MM"`);
  }

  // Day 0 of next month is the last day of current month
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startDate = `${yearStr}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${yearStr}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const dates: Array<{ date: string; dayOfWeek: string; isSunday: boolean }> = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let d = 1; d <= lastDayOfMonth; d++) {
    const dateStr = `${yearStr}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    // Using UTC date to avoid local TZ skew
    const dayIndex = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    dates.push({
      date: dateStr,
      dayOfWeek: dayNames[dayIndex],
      isSunday: dayIndex === 0,
    });
  }

  const workingDays = dates.filter((d) => !d.isSunday).length;

  return {
    year,
    month,
    daysInMonth: lastDayOfMonth,
    startDate,
    endDate,
    dates,
    workingDays,
  };
};

/**
 * Formats total minutes into a clean "X hrs Y mins" or "Xh Ym" string.
 */
export const formatMinutesToHours = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes <= 0) return '0 hrs 0 mins';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours} hrs ${mins} mins`;
};

