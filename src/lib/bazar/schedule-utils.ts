/**
 * Bazar Schedule Utilities with Asia/Dhaka Timezone Handling
 */

export type ScheduleStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';

/**
 * Returns today's date in Asia/Dhaka timezone formatted as 'YYYY-MM-DD'.
 */
export function getDhakaTodayString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Normalizes a Date or string to 'YYYY-MM-DD' in Asia/Dhaka timezone.
 */
export function toDhakaDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Formats a Date or date string to a human-friendly format (e.g. "08 Nov 2026").
 */
export function formatScheduleDate(date: Date | string, language: 'en' | 'bn' = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (language === 'bn') {
    return new Intl.DateTimeFormat('bn-BD', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  }
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats a date range (e.g. "08 Nov – 09 Nov 2026").
 */
export function formatScheduleRange(
  startDate: Date | string,
  endDate: Date | string,
  language: 'en' | 'bn' = 'en'
): string {
  const startStr = formatScheduleDate(startDate, language);
  const endStr = formatScheduleDate(endDate, language);
  return `${startStr} – ${endStr}`;
}

/**
 * Automatically computes schedule status based on Asia/Dhaka current date.
 * - UPCOMING: startDate > today
 * - ONGOING: startDate <= today <= endDate
 * - COMPLETED: endDate < today
 */
export function computeScheduleStatus(
  startDate: Date | string,
  endDate: Date | string,
  referenceDateStr?: string
): ScheduleStatus {
  const today = referenceDateStr || getDhakaTodayString();
  const start = toDhakaDateString(startDate);
  const end = toDhakaDateString(endDate);

  if (today < start) {
    return 'UPCOMING';
  } else if (today >= start && today <= end) {
    return 'ONGOING';
  } else {
    return 'COMPLETED';
  }
}
