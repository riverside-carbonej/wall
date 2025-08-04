import { Injectable } from '@angular/core';
import pluralize from 'pluralize';

@Injectable({
  providedIn: 'root'
})
export class NlpService {

  /**
   * Capitalize titles properly (first letter of each word)
   */
  capitalizeTitle(text: string): string {
    if (!text) return '';
    return text.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get the singular form of a word
   */
  getSingular(word: string): string {
    if (!word) return '';
    return pluralize.singular(word);
  }

  /**
   * Get the plural form of a word
   */
  getPlural(word: string): string {
    if (!word) return '';
    return pluralize(word);
  }

  /**
   * Check if a word is already plural
   */
  isPlural(word: string): boolean {
    if (!word) return false;
    return pluralize.isPlural(word);
  }

  /**
   * Get the appropriate plural form for display (handles cases like "people" intelligently)
   */
  getDisplayPlural(word: string): string {
    if (!word) return '';
    
    // If already plural, use as-is
    if (this.isPlural(word)) {
      return this.capitalizeTitle(word);
    }
    
    // Otherwise, pluralize it
    return this.capitalizeTitle(this.getPlural(word));
  }

  /**
   * Get the appropriate singular form for display
   */
  getDisplaySingular(word: string): string {
    if (!word) return '';
    
    // If already singular, use as-is
    if (!this.isPlural(word)) {
      return this.capitalizeTitle(word);
    }
    
    // Otherwise, singularize it
    return this.capitalizeTitle(this.getSingular(word));
  }

  /**
   * Get appropriate page title for a preset
   * Examples:
   * - "people" -> "People"
   * - "person" -> "People" 
   * - "veteran" -> "Veterans"
   * - "staff" -> "Staff"
   */
  getPresetPageTitle(presetName: string): string {
    if (!presetName) return '';
    return this.getDisplayPlural(presetName);
  }

  /**
   * Get appropriate add button text
   * Examples:
   * - "people" -> "Add Person"
   * - "person" -> "Add Person"
   * - "veterans" -> "Add Veteran"
   */
  getAddButtonText(presetName: string): string {
    if (!presetName) return 'Add Item';
    const singular = this.getDisplaySingular(presetName);
    return `Add ${singular}`;
  }

  /**
   * Get appropriate empty state title
   * Examples:
   * - "people" -> "No People Yet"
   * - "person" -> "No People Yet"
   * - "veteran" -> "No Veterans Yet"
   */
  getEmptyStateTitle(presetName: string): string {
    if (!presetName) return 'No Items Yet';
    const plural = this.getDisplayPlural(presetName);
    return `No ${plural} Yet`;
  }

  /**
   * Get appropriate count text for subtitles
   * Examples:
   * - (5, "people") -> "5 people"
   * - (1, "people") -> "1 person" 
   * - (0, "people") -> "0 people"
   * - (3, "veteran") -> "3 veterans"
   * - (1, "veteran") -> "1 veteran"
   */
  getCountText(count: number, presetName: string): string {
    if (!presetName) return `${count} items`;
    
    if (count === 1) {
      // Use singular form for count of 1
      const singular = this.getSingular(presetName).toLowerCase();
      return `${count} ${singular}`;
    } else {
      // Use plural form for count of 0 or > 1
      const plural = this.getPlural(presetName).toLowerCase();
      return `${count} ${plural}`;
    }
  }

  /**
   * Get menu item title (plural form)
   */
  getMenuItemTitle(presetName: string): string {
    return this.getDisplayPlural(presetName);
  }
}