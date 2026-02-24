import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Category } from '../../core/models/dashboard.models';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './receipt.component.html',
  styleUrl: './receipt.component.css'
})
export class ReceiptComponent implements OnInit {
  private fb = inject(FormBuilder);
  settingsService = inject(SettingsService);
  dashboardDataService = inject(DashboardDataService);
  private confirmationService = inject(ConfirmationDialogService);

  receipts = signal<any[]>([]);
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

  receiptForm = this.fb.group({
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

    this.dashboardDataService.getReceipts(cleanParams).subscribe(data => {
      this.receipts.set(data.items);
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
    this.dashboardDataService.getReceiptCategories().subscribe(data => {
      this.categories.set(data);
    });
  }

  toggleForm() {
    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.receiptForm.reset();
    }
  }

  async onSubmit() {
    if (this.receiptForm.valid) {
      const confirmed = await this.confirmationService.confirm({
        title: 'Submit Receipt',
        message: 'Are you sure you want to record this receipt?',
        confirmText: 'Submit',
        cancelText: 'Cancel'
      });

      if (!confirmed) return;

      this.dashboardDataService.createReceipt(this.receiptForm.value).subscribe({
        next: () => {
          this.fetchData();
          this.toggleForm();
        },
        error: (err: any) => console.error('Failed to create receipt', err)
      });
    }
  }

  async deleteReceipt(id: number) {
    const receipt = this.receipts().find(r => r.id === id);
    const today = new Date().toISOString().split('T')[0];
    const receiptDate = receipt?.created_at ? receipt.created_at.split('T')[0].split(' ')[0] : null;

    if (receiptDate && receiptDate !== today) {
      await this.confirmationService.alert({
        title: 'Action Restricted',
        message: 'You cannot delete this receipt because the daily report for that day has already been calculated. Only receipts from today can be deleted.',
        confirmText: 'OK'
      });
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Receipt',
      message: 'Are you sure you want to delete this receipt record? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      this.dashboardDataService.deleteReceipt(id).subscribe({
        next: () => {
          this.receipts.update(prev => prev.filter(r => r.id !== id));
        },
        error: (err: any) => console.error('Failed to delete receipt', err)
      });
    }
  }
}
