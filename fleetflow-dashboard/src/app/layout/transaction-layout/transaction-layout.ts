import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Transaction } from '../../shared/ui/transaction/transaction';

@Component({
  selector: 'app-transaction-layout',
  imports: [CommonModule, Transaction],
  templateUrl: './transaction-layout.html',
  styleUrl: './transaction-layout.css',
})
export class TransactionLayout implements OnInit {
  title: string = 'Transaction Details';
  categories: string[] = [];
  transactionType: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.transactionType = params['type'];
        this.title = `${params['type']} Details`;
        
        try {
          this.categories = params['categories'] ? JSON.parse(params['categories']) : [];
        } catch (e) {
          this.categories = [];
        }
      }
    });
  }
}
