import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { SettingsService } from '../../services/settings.service';

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

  get details(): any {
    return this.invoice?.invoice_details || {};
  }

  get cartons(): any[] {
    return this.details?.cartons || [];
  }
}
