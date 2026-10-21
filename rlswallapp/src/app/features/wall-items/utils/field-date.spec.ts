import { formatFieldDate, formatIfDate, toDateInputValue, toFieldDate } from './field-date';

const day = (d: Date | null) => d && [d.getFullYear(), d.getMonth() + 1, d.getDate()];

describe('field-date', () => {
  describe('toFieldDate', () => {
    it('reads a bare day as that day, in any timezone', () => {
      expect(day(toFieldDate('2002-10-01'))).toEqual([2002, 10, 1]);
    });

    it('reads an imported midnight UTC stamp as the day it names', () => {
      expect(day(toFieldDate('1952-01-01T00:00:00.000Z'))).toEqual([1952, 1, 1]);
      expect(day(toFieldDate('1952-01-01T00:00:00Z'))).toEqual([1952, 1, 1]);
    });

    it('reads Dates, Timestamps and flexible dates', () => {
      expect(day(toFieldDate(new Date(1997, 5, 1)))).toEqual([1997, 6, 1]);
      expect(day(toFieldDate({ toDate: () => new Date(1941, 0, 1) }))).toEqual([1941, 1, 1]);
      expect(day(toFieldDate({ seconds: new Date(1941, 0, 1).getTime() / 1000 }))).toEqual([1941, 1, 1]);
      expect(day(toFieldDate({ precision: 'year', year: 1964 }))).toEqual([1964, 1, 1]);
      expect(day(toFieldDate({ precision: 'day', year: 2003, month: 7, day: 1 }))).toEqual([2003, 8, 1]);
    });

    it('gives null for empty values and anything that is not a date', () => {
      for (const value of [null, undefined, '', 'Unknown', 'Spring 1964', '1964', new Date('nope'), '2002-02-30', {}, []]) {
        expect(toFieldDate(value)).withContext(String(value)).toBeNull();
      }
    });
  });

  describe('toDateInputValue', () => {
    it('gives the local day as YYYY-MM-DD', () => {
      expect(toDateInputValue(new Date(1997, 5, 1))).toBe('1997-06-01');
      expect(toDateInputValue('1952-01-01T00:00:00.000Z')).toBe('1952-01-01');
    });

    it('gives null when there is no usable date', () => {
      expect(toDateInputValue('Unknown')).toBeNull();
      expect(toDateInputValue(new Date('nope'))).toBeNull();
    });
  });

  describe('formatFieldDate', () => {
    it('formats each kind of date', () => {
      expect(formatFieldDate('2002-10-01')).toBe(new Date(2002, 9, 1).toLocaleDateString());
      expect(formatFieldDate({ precision: 'year', year: 1964 })).toBe('1964');
      expect(formatFieldDate({ precision: 'month', year: 1964, month: 2 })).toBe('March 1964');
    });

    it('shows text that is not a date as written, and never "Invalid Date"', () => {
      expect(formatFieldDate('Spring 1964')).toBe('Spring 1964');
      expect(formatFieldDate(new Date('nope'))).toBe('');
      expect(formatFieldDate(null)).toBe('');
    });
  });

  describe('formatIfDate', () => {
    it('formats only values that are dates', () => {
      expect(formatIfDate('1952-01-01T00:00:00.000Z')).toBe(new Date(1952, 0, 1).toLocaleDateString());
      expect(formatIfDate('Ronald Rein')).toBeNull();
      expect(formatIfDate('1964')).toBeNull();
      expect(formatIfDate({ address: 'Painesville' })).toBeNull();
    });
  });
});
