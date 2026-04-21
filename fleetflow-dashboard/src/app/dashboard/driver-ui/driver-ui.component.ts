import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MobileNavComponent } from '../../shared/ui/mobile-nav/mobile-nav.component';
import { PendingChangesAware } from '../../guards/pending-changes.guard';
import { TotalCargoCardComponent } from '../total-cargo-card.component/total-cargo-card.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-driver-ui',
  standalone: true,
  imports: [CommonModule, RouterModule, MobileNavComponent, TotalCargoCardComponent],
  templateUrl: './driver-ui.component.html',
})
export class DriverUiComponent implements PendingChangesAware {
  private authService = inject(AuthService);

  // User Signals from AuthService
  readonly fullName = this.authService.currentUserFullName;
  readonly userName = this.authService.currentUserName;
  readonly userRole = this.authService.currentUserRole;
  readonly officeName = this.authService.currentUserOfficeName;

  logout() {
    this.authService.logout();
  }

  canDeactivate(): boolean {
    return true;
  }
}
