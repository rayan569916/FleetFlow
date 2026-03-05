import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { SettingsService } from '../../services/settings.service';
import { DailyReportData } from '../../services/report.service';

@Component({
  selector: 'app-daily-breakdown-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-breakdown-view.component.html',
  styleUrl: './daily-breakdown-view.component.css',
})
export class DailyBreakdownViewComponent {
  @Input() report: DailyReportData | null = null;
  @Input() invoices: any[] = [];
  @Input() payments: any[] = [];
  @Input() purchases: any[] = [];
  @Input() receipts: any[] = [];
  
  @Output() editInvoice = new EventEmitter<any>();
  @Output() editPayment = new EventEmitter<any>();
  @Output() editPurchase = new EventEmitter<any>();
  @Output() editReceipt = new EventEmitter<any>();

  settingsService = inject(SettingsService);
}
