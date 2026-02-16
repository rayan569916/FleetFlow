import { ChangeDetectionStrategy, Component, input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SIDEBAR_ITEMS } from '../../core/constants/dashboard.constants';
import { UiStateService } from '../../services/ui-state.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly expanded = input<boolean>(false);
  readonly items = SIDEBAR_ITEMS;
  private uiStateService = inject(UiStateService);

  trackById(index: number): number {
    return index;
  }

  toggleSidebar(): void {
    this.uiStateService.toggleSidebar();
  }
}
