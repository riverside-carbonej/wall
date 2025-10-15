import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialIconComponent } from '../material-icon/material-icon.component';

export type DatePrecision = 'year' | 'month' | 'day';

export interface FlexibleDateValue {
  precision: DatePrecision;
  year: number;
  month?: number; // 0-11 (January = 0)
  day?: number; // 1-31
}

@Component({
  selector: 'app-material-date-picker',
  standalone: true,
  imports: [CommonModule, MaterialIconComponent],
  templateUrl: './material-date-picker.component.html',
  styleUrls: ['./material-date-picker.component.css']
})
export class MaterialDatePickerComponent implements OnInit, OnDestroy {
  @Input() value: Date | string | FlexibleDateValue | null = null;
  @Input() allowFlexiblePrecision: boolean = false; // Enable flexible precision mode
  @Output() dateSelected = new EventEmitter<Date | FlexibleDateValue>();
  @ViewChild('pickerContainer') pickerContainer!: ElementRef;
  @ViewChild('pickerPopup') pickerPopup!: ElementRef;

  isOpen = false;
  popupPosition = { top: '0px', left: '0px' };
  currentMonth: Date = new Date();
  selectedDate: Date | null = null;
  selectedFlexibleDate: FlexibleDateValue | null = null;
  currentPrecision: DatePrecision = 'day'; // Current precision being selected
  today = new Date();
  private boundHandleOutsideClick!: (event: MouseEvent) => void;

  weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  showYearSelector = false;
  showMonthSelector = false;
  yearOptions: number[] = [];

  get currentMonthName(): string {
    return this.monthNames[this.currentMonth.getMonth()];
  }
  
  get currentYear(): number {
    return this.currentMonth.getFullYear();
  }

  get monthYear(): string {
    return `${this.monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
  }

  get calendarDays(): (number | null)[][] {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startOffset; i++) {
      currentWeek.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Add remaining week if not empty
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    
    return weeks;
  }

  ngOnInit() {
    if (this.value) {
      // Handle FlexibleDateValue
      if (typeof this.value === 'object' && 'precision' in this.value) {
        this.selectedFlexibleDate = this.value;
        this.currentPrecision = this.value.precision;
        this.currentMonth = new Date(this.value.year, this.value.month || 0, 1);
      } else {
        // Handle Date or string
        this.selectedDate = this.value instanceof Date ? this.value : new Date(this.value);
        this.currentMonth = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1);
      }
    }

    // Initialize year options (from 1900 to current year + 10)
    const currentYear = new Date().getFullYear();
    for (let year = 1900; year <= currentYear + 10; year++) {
      this.yearOptions.push(year);
    }

    // Close picker when clicking outside - bind once and store reference
    this.boundHandleOutsideClick = this.handleOutsideClick.bind(this);
    document.addEventListener('click', this.boundHandleOutsideClick);
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.boundHandleOutsideClick);
  }

  private handleOutsideClick(event: MouseEvent) {
    if (this.pickerContainer && !this.pickerContainer.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  togglePicker(event: Event) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      // Calculate position after DOM updates
      setTimeout(() => this.updatePopupPosition(), 0);
    }
  }

  private updatePopupPosition() {
    if (!this.pickerContainer) return;

    const trigger = this.pickerContainer.nativeElement.querySelector('.date-picker-trigger');
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Position below by default, above if not enough space
    if (spaceBelow >= 400 || spaceBelow > spaceAbove) {
      this.popupPosition = {
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`
      };
    } else {
      this.popupPosition = {
        top: `${rect.top - 400}px`,
        left: `${rect.left}px`
      };
    }
  }

  previousMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
  }

  selectDate(day: number | null) {
    if (!day) return;

    if (this.allowFlexiblePrecision) {
      // Emit flexible date value with full precision
      this.selectedFlexibleDate = {
        precision: 'day',
        year: this.currentMonth.getFullYear(),
        month: this.currentMonth.getMonth(),
        day: day
      };
      this.dateSelected.emit(this.selectedFlexibleDate);
    } else {
      // Emit regular Date object
      const selected = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), day);
      this.selectedDate = selected;
      this.dateSelected.emit(selected);
    }

    this.isOpen = false;
  }

  isSelected(day: number | null): boolean {
    if (!day) return false;

    // Check flexible date
    if (this.selectedFlexibleDate && this.selectedFlexibleDate.precision === 'day') {
      return this.selectedFlexibleDate.day === day &&
             this.selectedFlexibleDate.month === this.currentMonth.getMonth() &&
             this.selectedFlexibleDate.year === this.currentMonth.getFullYear();
    }

    // Check regular date
    if (this.selectedDate) {
      return this.selectedDate.getDate() === day &&
             this.selectedDate.getMonth() === this.currentMonth.getMonth() &&
             this.selectedDate.getFullYear() === this.currentMonth.getFullYear();
    }

    return false;
  }

  isToday(day: number | null): boolean {
    if (!day) return false;
    return this.today.getDate() === day &&
           this.today.getMonth() === this.currentMonth.getMonth() &&
           this.today.getFullYear() === this.currentMonth.getFullYear();
  }

  selectToday() {
    this.selectedDate = new Date();
    this.currentMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    this.dateSelected.emit(this.selectedDate);
    this.isOpen = false;
  }

  clearDate() {
    this.selectedDate = null;
    this.selectedFlexibleDate = null;
    this.dateSelected.emit(null as any);
    this.isOpen = false;
  }
  
  toggleYearSelector() {
    this.showYearSelector = !this.showYearSelector;
    this.showMonthSelector = false;
  }
  
  toggleMonthSelector() {
    this.showMonthSelector = !this.showMonthSelector;
    this.showYearSelector = false;
  }
  
  selectYear(year: number) {
    if (this.allowFlexiblePrecision && this.currentPrecision === 'year') {
      // Select only year
      this.selectedFlexibleDate = {
        precision: 'year',
        year: year
      };
      this.dateSelected.emit(this.selectedFlexibleDate);
      this.isOpen = false;
    } else {
      this.currentMonth = new Date(year, this.currentMonth.getMonth(), 1);
    }
    this.showYearSelector = false;
  }

  selectMonth(monthIndex: number) {
    if (this.allowFlexiblePrecision && this.currentPrecision === 'month') {
      // Select year and month only
      this.selectedFlexibleDate = {
        precision: 'month',
        year: this.currentMonth.getFullYear(),
        month: monthIndex
      };
      this.dateSelected.emit(this.selectedFlexibleDate);
      this.isOpen = false;
    } else {
      this.currentMonth = new Date(this.currentMonth.getFullYear(), monthIndex, 1);
    }
    this.showMonthSelector = false;
  }

  setPrecision(precision: DatePrecision) {
    this.currentPrecision = precision;

    // Show appropriate selector based on precision
    if (precision === 'year') {
      this.showYearSelector = true;
      this.showMonthSelector = false;
    } else if (precision === 'month') {
      this.showMonthSelector = true;
      this.showYearSelector = false;
    } else {
      this.showYearSelector = false;
      this.showMonthSelector = false;
    }
  }

  getDisplayValue(): string {
    if (this.selectedFlexibleDate) {
      switch (this.selectedFlexibleDate.precision) {
        case 'year':
          return this.selectedFlexibleDate.year.toString();
        case 'month':
          return `${this.monthNames[this.selectedFlexibleDate.month!]} ${this.selectedFlexibleDate.year}`;
        case 'day':
          if (this.selectedFlexibleDate.day !== undefined && this.selectedFlexibleDate.month !== undefined) {
            return new Date(this.selectedFlexibleDate.year, this.selectedFlexibleDate.month, this.selectedFlexibleDate.day).toLocaleDateString();
          }
          return '';
      }
    }

    if (this.selectedDate) {
      return this.selectedDate.toLocaleDateString();
    }

    return '';
  }
}