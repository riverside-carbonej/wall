import { Component, Input, Output, EventEmitter, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialIconComponent } from '../material-icon/material-icon.component';

@Component({
  selector: 'app-material-date-picker',
  standalone: true,
  imports: [CommonModule, MaterialIconComponent],
  templateUrl: './material-date-picker.component.html',
  styleUrls: ['./material-date-picker.component.css']
})
export class MaterialDatePickerComponent implements OnInit {
  @Input() value: Date | string | null = null;
  @Output() dateSelected = new EventEmitter<Date>();
  @ViewChild('pickerContainer') pickerContainer!: ElementRef;

  isOpen = false;
  currentMonth: Date = new Date();
  selectedDate: Date | null = null;
  today = new Date();
  
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
      this.selectedDate = this.value instanceof Date ? this.value : new Date(this.value);
      this.currentMonth = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1);
    }
    
    // Initialize year options (20 years before and after current year)
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 50; year <= currentYear + 50; year++) {
      this.yearOptions.push(year);
    }
    
    // Close picker when clicking outside
    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
  }

  private handleOutsideClick(event: MouseEvent) {
    if (this.pickerContainer && !this.pickerContainer.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  togglePicker(event: Event) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  previousMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
  }

  selectDate(day: number | null) {
    if (!day) return;
    
    const selected = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), day);
    this.selectedDate = selected;
    this.dateSelected.emit(selected);
    this.isOpen = false;
  }

  isSelected(day: number | null): boolean {
    if (!day || !this.selectedDate) return false;
    return this.selectedDate.getDate() === day &&
           this.selectedDate.getMonth() === this.currentMonth.getMonth() &&
           this.selectedDate.getFullYear() === this.currentMonth.getFullYear();
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
    this.dateSelected.emit(new Date(''));
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
    this.currentMonth = new Date(year, this.currentMonth.getMonth(), 1);
    this.showYearSelector = false;
  }
  
  selectMonth(monthIndex: number) {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), monthIndex, 1);
    this.showMonthSelector = false;
  }
}