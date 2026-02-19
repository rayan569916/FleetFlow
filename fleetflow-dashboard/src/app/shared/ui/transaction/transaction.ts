import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Entry } from '../../../core/models/dashboard.models';
import { TRANSACTION_CATEGORIES } from '../../../core/constants/dashboard.constants';
import { CardComponent } from '../card/card.component';
import { AuthService } from '../../../services/auth.service';
import { SettingsService } from '../../../services/settings.service';
import { TransactionService } from '../../../services/transaction.service';

@Component({
  selector: 'app-transaction',
  imports: [CommonModule, ReactiveFormsModule, CardComponent],
  templateUrl: './transaction.html',
  styleUrl: './transaction.css',
})
export class Transaction implements OnInit, OnChanges {
  @Input() title: string = 'Entry';
  @Input() categories: string[] = Array.from(TRANSACTION_CATEGORIES);
  @Input() transactionType: string = '';

  entryForm!: FormGroup;
  allEntries: Entry[] = [];
  filteredEntries: Entry[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 5;
  totalPages = 1;

  authService = inject(AuthService);
  settingsService = inject(SettingsService);
  transactionService = inject(TransactionService);

  constructor(private fb: FormBuilder) {
    this.entryForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]],
      category: ['', Validators.required],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      description: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadEntries();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['transactionType']) {
      this.loadEntries();
    }
  }

  loadEntries() {
    if (!this.transactionType) return;

    this.transactionService.getTransactions(this.transactionType).subscribe({
      next: (data: Entry[]) => {
        this.allEntries = data;
        this.applyFilter('');
      },
      error: (err: any) => console.error('Failed to load transactions', err)
    });
  }

  onSubmit(): void {
    if (this.entryForm.valid) {
      const newEntry: Omit<Entry, 'id'> = {
        ...this.entryForm.value,
        transactionType: this.transactionType // Ensure backend knows the type if needed, or handled by endpoint
      };

      this.transactionService.addTransaction(newEntry).subscribe({
        next: (savedEntry: Entry) => {
          this.allEntries.unshift(savedEntry);
          this.applyFilter(this.entryForm.get('category')?.value || '');
          this.entryForm.reset({
            category: '',
            description: '',
            amount: '',
            date: new Date().toISOString().split('T')[0]
          });
        },
        error: (err: any) => console.error('Failed to save transaction', err)
      });
    } else {
      this.entryForm.markAllAsTouched();
    }
  }

  applyFilter(category: string) {
    this.filteredEntries = category
      ? this.allEntries.filter(e => e.category === category)
      : [...this.allEntries];
    this.currentPage = 1;
    this.calculatePages();
  }

  calculatePages() {
    this.totalPages = Math.ceil(this.filteredEntries.length / this.pageSize);
  }

  get paginatedData() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEntries.slice(start, start + this.pageSize);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  deleteEntry(id: number): void {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    this.transactionService.deleteTransaction(id).subscribe({
      next: () => {
        this.allEntries = this.allEntries.filter(e => e.id !== id);
        this.applyFilter(this.entryForm.get('category')?.value || '');
        if (this.currentPage > this.totalPages && this.currentPage > 1) {
          this.currentPage--;
        }
      },
      error: (err: any) => console.error('Failed to delete transaction', err)
    });
  }
}
