import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Entry } from '../../../core/models/dashboard.models';
import { TRANSACTION_CATEGORIES } from '../../../core/constants/dashboard.constants';
import { CardComponent } from '../card/card.component';

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

  constructor(private fb: FormBuilder) {
    this.entryForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(1)]],
      category: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.generateDummyData();
    this.calculatePages();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['transactionType'] || changes['categories']) {
      this.allEntries = [];
      this.generateDummyData();
      this.calculatePages();
    }
  }

  generateDummyData() {
    if (this.categories.length === 0) {
      console.warn('Categories are empty. Using default categories.');
      this.categories = ['Misc'];
    }

    for (let i = 1; i <= 25; i++) {
      this.allEntries.push({
        id: i,
        amount: Math.floor(Math.random() * 1000) + 100,
        category: this.categories[i % this.categories.length],
        description: `${this.transactionType} #${1000 + i}`,
        date: new Date().toLocaleDateString(),
      });
    }
    this.filteredEntries = [...this.allEntries];
    this.calculatePages();
  }

  onSubmit(): void {
    if (this.entryForm.valid) {
      const newEntry: Entry = {
        id: Date.now(),
        ...this.entryForm.value,
        date: new Date().toLocaleDateString(),
      };
      this.allEntries.unshift(newEntry);
      this.applyFilter(''); // Reset filter on add
      this.entryForm.reset({ category: '', description: '', amount: '' });
    } else {
      // Highlight invalid fields
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
}
