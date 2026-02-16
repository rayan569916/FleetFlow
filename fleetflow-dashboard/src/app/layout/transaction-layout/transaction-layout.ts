import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Transaction } from '../../shared/ui/transaction/transaction';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { UiStateService } from '../../services/ui-state.service';

@Component({
  selector: 'app-transaction-layout',
  standalone: true,
  imports: [CommonModule, AsyncPipe, Transaction, SidebarComponent, HeaderComponent],
  templateUrl: './transaction-layout.html',
  styleUrl: './transaction-layout.css',
})
export class TransactionLayout implements OnInit {
  title: string = 'Transaction Details';
  categories: string[] = [];
  transactionType: string = '';
  private uiStateService = inject(UiStateService);

  readonly sidebarExpanded$ = this.uiStateService.sidebarExpanded$;

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

  toggleSidebar(): void {
    this.uiStateService.toggleSidebar();
  }

  closeSidebar(): void {
    this.uiStateService.setSidebarExpanded(false);
  }
}
