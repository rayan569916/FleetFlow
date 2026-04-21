import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { SettingsService } from '../../services/settings.service';
// import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-invoice-details-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-details-view.component.html',
  styleUrl: './invoice-details-view.component.css',
})
export class InvoiceDetailsViewComponent {
  @Input() invoice: any;

  settingsService = inject(SettingsService);

  // authService = inject(AuthService);
  // // User status signal
  // readonly isDriver = this.authService.isDriver;


  get details(): any {
    return this.invoice?.invoice_details || {};
  }

  get cartons(): any[] {
    return this.details?.cartons || [];
  }
}
