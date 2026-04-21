import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { InvoiceService, Invoice } from '../../services/invoice.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { ToastService } from '../../services/toast.service';
import { Title } from '@angular/platform-browser';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-bank-approvals',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './bank-approvals.component.html'
})
export class BankApprovalsComponent implements OnInit {
  invoices: Invoice[] = [];
  isLoading = false;
  lastRefreshedAt: Date | null = null;
  totalInvoices = 0;

  private invoiceService = inject(InvoiceService);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationDialogService);
  private titleService = inject(Title);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.titleService.setTitle('Bank Approvals | FleetFlow');
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.isLoading = true;
    this.cdr.detectChanges(); // Trigger loading state update
    
    this.invoiceService.getInvoices({ 
      status: 'Awaiting Bank Approval', 
      mode_of_payment: 'Direct Bank Transfer',
      per_page: 50 
    }).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges(); // Ensure spinner hides
      })
    ).subscribe({
      next: (data: any) => {
        console.log('Bank Approvals fetched successfully:', data);
        
        try {
          // Comprehensive mapping to handle various response structures
          if (Array.isArray(data)) {
            this.invoices = data;
          } else if (data && typeof data === 'object') {
            this.invoices = data.items || data.invoices || data.data || data.results || [];
          } else {
            this.invoices = [];
          }
          
          this.totalInvoices = data?.total ?? this.invoices.length;
          this.lastRefreshedAt = new Date();
          
          console.log(`Final processed invoices count: ${this.invoices.length}`);
          this.cdr.detectChanges(); // Force UI to update even if outside Zone
        } catch (err) {
          console.error('Data mapping error:', err);
          this.invoices = [];
        }
      },
      error: (err: any) => {
        console.error('Failed to load invoices:', err);
        this.toastService.show('Failed to load pending bank approvals.', 'error');
      }
    });
  }

  async verifyPayment(invoice: Invoice): Promise<void> {
    const isConfirmed = await this.confirmationService.confirm({
      title: 'Verify Payment',
      message: `Are you sure you want to mark invoice ${invoice.invoice_number} as Paid? This indicates that the direct bank transfer has been successfully received.`,
      confirmText: 'Mark as Paid',
      cancelText: 'Cancel'
    });

    if (!isConfirmed) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    this.invoiceService.updateStatus(invoice.id!, 'Paid').subscribe({
      next: () => {
        this.toastService.show(`Invoice ${invoice.invoice_number} marked as paid successfully.`, 'success');
        this.loadInvoices();
      },
      error: (err: any) => {
        console.error('Failed to mark invoice as paid', err);
        this.toastService.show('Failed to update invoice status.', 'error');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  trackByInvoiceId(index: number, invoice: Invoice): number | string {
    return invoice.id || index;
  }
}
