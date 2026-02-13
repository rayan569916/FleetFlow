import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private readonly sidebarExpandedSubject = new BehaviorSubject<boolean>(false);

  readonly sidebarExpanded$ = this.sidebarExpandedSubject.asObservable();

  toggleSidebar(): void {
    this.sidebarExpandedSubject.next(!this.sidebarExpandedSubject.value);
  }

  setSidebarExpanded(value: boolean): void {
    this.sidebarExpandedSubject.next(value);
  }
}
