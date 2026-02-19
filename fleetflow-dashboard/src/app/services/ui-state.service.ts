import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private readonly STORAGE_KEY = 'sidebar_expanded';
  // Initialize with false by default, or verify valid value from localStorage
  private readonly sidebarExpandedSubject = new BehaviorSubject<boolean>(this.getInitialState());

  readonly sidebarExpanded$ = this.sidebarExpandedSubject.asObservable();

  private getInitialState(): boolean {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored === 'true'; // Default to false if not set or 'false'
    }
    return false;
  }

  toggleSidebar(): void {
    const newValue = !this.sidebarExpandedSubject.value;
    this.sidebarExpandedSubject.next(newValue);
    this.saveState(newValue);
  }

  setSidebarExpanded(value: boolean): void {
    this.sidebarExpandedSubject.next(value);
    this.saveState(value);
  }

  private saveState(value: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, String(value));
    }
  }
}
