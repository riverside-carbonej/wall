import { WallItem } from '../../../shared/models/wall.model';

/** Field types that make sense to sort by in the per-object-type list pages. */
export const SORTABLE_FIELD_TYPES = new Set(['text', 'number', 'date', 'email', 'url', 'select']);

/** A value counts as "empty" (and therefore sorts last) when it has no usable content. */
export function isEmptyValue(v: any): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

/** Read a field value from an item, tolerating the legacy `data` map. */
export function getFieldValue(item: WallItem, fieldId: string): any {
  return (item.fieldData || item.data || {})[fieldId];
}

/**
 * Return a new array of items sorted by a single field.
 * - number fields (and text fields whose present values are all numeric, e.g. a
 *   "Graduation Year" stored as text) sort numerically
 * - date fields sort chronologically
 * - everything else sorts with locale-aware, case-insensitive, numeric-aware compare
 * - empty values always sort to the end, regardless of direction
 */
export function sortWallItems(
  items: WallItem[],
  fieldId: string,
  type: string,
  dir: 'asc' | 'desc'
): WallItem[] {
  const present = items.map(it => getFieldValue(it, fieldId)).filter(v => !isEmptyValue(v));
  const numericText = type !== 'date' && present.length > 0 && present.every(v => !isNaN(Number(v)));
  const d = dir === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    const va = getFieldValue(a, fieldId);
    const vb = getFieldValue(b, fieldId);
    const ea = isEmptyValue(va);
    const eb = isEmptyValue(vb);
    if (ea && eb) return 0;
    if (ea) return 1;   // blanks last, regardless of direction
    if (eb) return -1;

    let result: number;
    if (type === 'number' || numericText) {
      result = Number(va) - Number(vb);
    } else if (type === 'date') {
      result = new Date(va).getTime() - new Date(vb).getTime();
    } else {
      result = String(va).localeCompare(String(vb), undefined, { sensitivity: 'base', numeric: true });
    }
    return result * d;
  });
}
