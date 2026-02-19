import { ChangeDetectionStrategy, Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SIDEBAR_ITEMS } from '../../core/constants/dashboard.constants';
import { UiStateService } from '../../services/ui-state.service';
import { AuthService } from '../../services/auth.service';


export interface NavGroup {
  label?: string;
  items: any[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly expanded = input<boolean>(false);
  private uiStateService = inject(UiStateService);
  private authService = inject(AuthService);

  readonly navGroups = computed<NavGroup[]>(() => {
    const isAdminOrCEO = this.authService.isSuperAdminOrCEO();
    const allItems = SIDEBAR_ITEMS;

    const groups: NavGroup[] = [
      {
        label: 'Overview',
        items: allItems.filter(i => i.id === 'dashboard')
      },
      {
        label: 'Fleet Management',
        items: allItems.filter(i => ['tracking', 'shipments', 'live-tracking', 'drivers'].includes(i.id))
      },
      {
        label: 'Finance',
        items: allItems.filter(i => ['income', 'reports', 'invoice', 'payment', 'receipt', 'purchase'].includes(i.id))
      },
      {
        label: 'System',
        items: allItems.filter(i => {
          if (['settings'].includes(i.id)) return true;
          if (i.id === 'register') return isAdminOrCEO;
          return false;
        })
      }
    ];

    return groups.filter(g => g.items.length > 0);
  });

  readonly logoutItem = computed(() => SIDEBAR_ITEMS.find(i => i.id === 'logout'));

  trackByGroup(index: number, group: NavGroup): string {
    return group.label || index.toString();
  }

  trackById(index: number, item: any): string {
    return item.id;
  }

  handleItemClick(item: any): void {
    if (item.id === 'logout') {
      this.authService.logout();
    }

    // Only close sidebar on mobile devices (width < 768px) and running in browser
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.uiStateService.setSidebarExpanded(false);
    }
  }

  toggleSidebar(): void {
    this.uiStateService.toggleSidebar();
  }
}
