import { FlexibleDateValue } from '../../../shared/components/material-date-picker/material-date-picker.component';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// A bare day ("2002-10-01"), or a day stamped at midnight UTC ("1952-01-01T00:00:00.000Z"),
// which is how imported dates were saved. Both mean that calendar day, wherever the viewer is.
const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00(?::00(?:\.0+)?)?(?:Z|[+-]00:?00))?$/;

export function isFlexibleDate(value: any): value is FlexibleDateValue {
  return !!value && typeof value === 'object' && 'precision' in value && typeof value.year === 'number';
}

/**
 * Any stored date as a local Date on the day it names, or null when it is empty or
 * not a date. Year and month precision dates land on the first of their period.
 */
export function toFieldDate(value: any): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  if (isFlexibleDate(value)) {
    const date = new Date(value.year, value.month ?? 0, value.day ?? 1);
    return isNaN(date.getTime()) ? null : date;
  }

  // Firestore Timestamp, live or serialized
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') return toFieldDate(value.toDate());
    if (typeof value.seconds === 'number') return toFieldDate(new Date(value.seconds * 1000));
    return null;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    const day = CALENDAR_DAY.exec(text);
    if (day) {
      const date = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
      return date.getMonth() === Number(day[2]) - 1 ? date : null;
    }
    // Only full dates with a time; "1964" or "Spring 1964" stay as the text they are.
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
      const date = new Date(text);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/** A date field's value as "YYYY-MM-DD" for a form, or null when there is no usable date. */
export function toDateInputValue(value: any): string | null {
  const date = toFieldDate(value);
  if (!date) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * A date field's value for people to read. Year and month precision dates read as
 * "1964" and "March 1964"; text that isn't a date is shown as written.
 */
export function formatFieldDate(value: any): string {
  if (value === null || value === undefined || value === '') return '';

  if (isFlexibleDate(value)) {
    if (value.precision === 'year') return String(value.year);
    if (value.precision === 'month' && value.month !== undefined) return `${MONTHS[value.month]} ${value.year}`;
  }

  const date = toFieldDate(value);
  if (date) return date.toLocaleDateString();

  return typeof value === 'string' ? value.trim() : '';
}

/** A date for display if the value is one, else null, so callers can fall back to their own formatting. */
export function formatIfDate(value: any): string | null {
  if (isFlexibleDate(value) || value instanceof Date) return formatFieldDate(value);
  if (value && typeof value === 'object' && (typeof value.toDate === 'function' || typeof value.seconds === 'number')) {
    return formatFieldDate(value);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value.trim()) && toFieldDate(value)) {
    return formatFieldDate(value);
  }
  return null;
}
