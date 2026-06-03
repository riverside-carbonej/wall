import { WallItem } from '../../../shared/models/wall.model';
import { SORTABLE_FIELD_TYPES, isEmptyValue, getFieldValue, sortWallItems } from './wall-item-sort';

// Minimal item factory — only fieldData matters for sorting.
const item = (fieldData: Record<string, any>): WallItem => ({ fieldData } as any);
const vals = (items: WallItem[], field: string) => items.map(i => getFieldValue(i, field));

describe('wall-item-sort', () => {
  describe('isEmptyValue', () => {
    it('treats null/undefined/""/[] as empty', () => {
      expect(isEmptyValue(null)).toBeTrue();
      expect(isEmptyValue(undefined)).toBeTrue();
      expect(isEmptyValue('')).toBeTrue();
      expect(isEmptyValue([])).toBeTrue();
    });
    it('treats 0, false and non-empty values as present', () => {
      expect(isEmptyValue(0)).toBeFalse();
      expect(isEmptyValue('x')).toBeFalse();
      expect(isEmptyValue(['a'])).toBeFalse();
    });
  });

  describe('getFieldValue', () => {
    it('reads from fieldData and falls back to legacy data map', () => {
      expect(getFieldValue({ fieldData: { name: 'A' } } as any, 'name')).toBe('A');
      expect(getFieldValue({ data: { name: 'B' } } as any, 'name')).toBe('B');
    });
  });

  describe('sortWallItems', () => {
    it('sorts text ascending and descending, case-insensitively', () => {
      const items = [item({ name: 'beta' }), item({ name: 'Alpha' }), item({ name: 'gamma' })];
      expect(vals(sortWallItems(items, 'name', 'text', 'asc'), 'name')).toEqual(['Alpha', 'beta', 'gamma']);
      expect(vals(sortWallItems(items, 'name', 'text', 'desc'), 'name')).toEqual(['gamma', 'beta', 'Alpha']);
    });

    it('sorts number fields numerically (not lexicographically)', () => {
      const items = [item({ y: 100 }), item({ y: 9 }), item({ y: 21 })];
      expect(vals(sortWallItems(items, 'y', 'number', 'asc'), 'y')).toEqual([9, 21, 100]);
    });

    it('sorts numeric-looking TEXT numerically (e.g. Veterans Graduation Year)', () => {
      const items = [item({ y: '2001' }), item({ y: '1938' }), item({ y: '1976' })];
      // string sort would also work for equal-length years, so include a short one
      const mixed = [item({ y: '300' }), item({ y: '45' }), item({ y: '1938' })];
      expect(vals(sortWallItems(items, 'y', 'text', 'asc'), 'y')).toEqual(['1938', '1976', '2001']);
      expect(vals(sortWallItems(mixed, 'y', 'text', 'asc'), 'y')).toEqual(['45', '300', '1938']);
    });

    it('sorts date fields chronologically', () => {
      const items = [item({ d: '2010-05-01' }), item({ d: '1999-01-01' }), item({ d: '2020-12-31' })];
      expect(vals(sortWallItems(items, 'd', 'date', 'asc'), 'd')).toEqual(['1999-01-01', '2010-05-01', '2020-12-31']);
    });

    it('always sorts empty values LAST, in both directions', () => {
      const items = [item({ name: 'B' }), item({ name: '' }), item({ name: 'A' }), item({})];
      const asc = vals(sortWallItems(items, 'name', 'text', 'asc'), 'name');
      const desc = vals(sortWallItems(items, 'name', 'text', 'desc'), 'name');
      expect(asc.slice(0, 2)).toEqual(['A', 'B']);
      expect(asc.slice(2).every(v => isEmptyValue(v))).toBeTrue();
      expect(desc.slice(0, 2)).toEqual(['B', 'A']);
      expect(desc.slice(2).every(v => isEmptyValue(v))).toBeTrue();
    });

    it('does not mutate the input array', () => {
      const items = [item({ y: 3 }), item({ y: 1 })];
      const before = [...items];
      sortWallItems(items, 'y', 'number', 'asc');
      expect(items).toEqual(before);
    });
  });

  describe('SORTABLE_FIELD_TYPES', () => {
    it('includes scalar types and excludes complex ones', () => {
      ['text', 'number', 'date', 'select', 'email', 'url'].forEach(t => expect(SORTABLE_FIELD_TYPES.has(t)).toBeTrue());
      ['entity', 'relationship', 'location', 'file', 'multiselect', 'longtext', 'richtext'].forEach(
        t => expect(SORTABLE_FIELD_TYPES.has(t)).toBeFalse()
      );
    });
  });
});
