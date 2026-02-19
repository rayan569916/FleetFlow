import { ChangeDetectionStrategy, Component, output, inject, signal, OnInit } from '@angular/core';
import { RouterLink, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  readonly menuClicked = output<void>();

  userName = this.authService.currentUserFullName;
  userRole = this.authService.currentUserRole;

  currentPageTitle = signal<string>('Overview');

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      startWith(null), // Trigger initially
      map(() => {
        let child = this.activatedRoute.firstChild;
        while (child?.firstChild) {
          child = child.firstChild;
        }
        // Basic mapping for now, can be improved with route data
        const path = this.router.url.split('/')[2] || 'overview';
        return this.formatTitle(path);
      })
    ).subscribe(title => {
      this.currentPageTitle.set(title);
    });
  }

  private formatTitle(path: string): string {
    if (!path) return 'Overview';
    // Remove query params or IDs if simple split
    const cleanPath = path.split('?')[0].split('/')[0];

    // Custom mappings
    const mappings: Record<string, string> = {
      'overview': 'Overview',
      'drivers': 'Drivers',
      'vehicles': 'Vehicles',
      'maintenance': 'Maintenance',
      'routes': 'Routes',
      'reports': 'Reports',
      'income': 'Income',
      'invoice': 'Billing Invoice',
      'settings': 'Settings',
      'notifications': 'Notifications',
      'documents': 'Documents',
      'help': 'Help & Support',
      'tracking': 'Shipment Tracking',
      'payment': 'Payment',
      'receipt': 'Receipt',
      'purchase': 'Purchase',
      'register': 'Register User',
      'users': 'User Management'
    };

    return mappings[cleanPath] || cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1);
  }

  onToggleSidebar(): void {
    this.menuClicked.emit();
  }
}
