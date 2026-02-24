import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Category } from '../../core/models/dashboard.models';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent implements OnInit {
  private fb = inject(FormBuilder);
  settingsService = inject(SettingsService);
  dashboardDataService = inject(DashboardDataService);
  confirmationService = inject(ConfirmationDialogService);

  payments = signal<any[]>([]);
  categories = signal<Category[]>([]);
  showForm = signal(false);

  // Pagination & Filtering Signals
  searchTerm = signal('');
  selectedCategory = signal<number | null>(null);
  selectedDate = signal<string>('');
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  totalPages = signal(0);

  paymentForm = this.fb.group({
    amount: [null, [Validators.required, Validators.min(0.01)]],
    description: ['', [Validators.required]],
    category_id: [null, [Validators.required]]
  });

  constructor() {
    effect(() => {
      this.fetchData();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.fetchCategories();
  }

  fetchData() {
    const params = {
      page: this.currentPage(),
      per_page: this.pageSize(),
      search: this.searchTerm(),
      category_id: this.selectedCategory(),
      date: this.selectedDate()
    };

    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null && v !== '')
    );

    this.dashboardDataService.getPayments(cleanParams).subscribe(data => {
      this.payments.set(data.items);
      this.totalItems.set(data.total);
      this.totalPages.set(data.pages);
    });
  }

  onFilterChange() {
    this.currentPage.set(1);
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  fetchCategories() {
    this.dashboardDataService.getPaymentCategories().subscribe(data => {
      this.categories.set(data);
    });
  }

  toggleForm() {
    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.paymentForm.reset();
    }
  }

  async onSubmit() {
    if (this.paymentForm.valid) {
      const confirmed = await this.confirmationService.confirm({
        title: 'Submit Payment',
        message: 'Are you sure you want to record this payment?',
        confirmText: 'Submit',
        cancelText: 'Cancel'
      });

      if (!confirmed) return;

      this.dashboardDataService.createPayment(this.paymentForm.value).subscribe({
        next: () => {
          this.fetchData();
          this.toggleForm();
        },
        error: (err: any) => console.error('Failed to create payment', err)
      });
    }
  }

  async deletePayment(id: number) {
    const payment = this.payments().find(p => p.id === id);
    const today = new Date().toISOString().split('T')[0];
    const paymentDate = payment?.created_at ? payment.created_at.split('T')[0].split(' ')[0] : null;

    if (paymentDate && paymentDate !== today) {
      await this.confirmationService.alert({
        title: 'Action Restricted',
        message: 'You cannot delete this payment because the daily report for that day has already been calculated. Only payments from today can be deleted.',
        confirmText: 'OK'
      });
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Payment',
      message: 'Are you sure you want to delete this payment record? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      this.dashboardDataService.deletePayment(id).subscribe({
        next: () => {
          this.payments.update(prev => prev.filter(p => p.id !== id));
        },
        error: (err: any) => console.error('Failed to delete payment', err)
      });
    }
  }
}
