import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 class="text-3xl font-bold text-slate-800 tracking-tight">Purchase History</h1>
           <p class="text-slate-500 mt-1">Track fleet expenses and acquisitions.</p>
        </div>
        <button class="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Purchase
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input type="text" class="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all hover:bg-white" placeholder="Search purchases...">
        </div>
        <div class="flex gap-2">
            <select class="px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-white transition-colors">
                <option>All Status</option>
                <option>Completed</option>
                <option>Pending</option>
            </select>
            <input type="date" class="px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-white transition-colors">
        </div>
      </div>

      <!-- Purchases Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Item / Vendor</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (item of purchases(); track item.id) {
                <tr class="hover:bg-slate-50/50 transition-colors group">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                {{ item.item_name.charAt(0) }}
                            </div>
                            <div>
                                <div class="font-semibold text-slate-800">{{ item.item_name }}</div>
                                <div class="text-xs text-slate-500">{{ item.vendor || 'Unknown Vendor' }}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-600 font-medium">
                        {{ item.date | date:'mediumDate' }}
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize"
                              [ngClass]="{
                                'bg-green-100 text-green-700': item.status === 'Completed',
                                'bg-yellow-100 text-yellow-700': item.status === 'Pending',
                                'bg-red-100 text-red-700': item.status === 'Cancelled'
                              }">
                            {{ item.status }}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right text-sm font-bold text-slate-800">
                        {{ settingsService.currencySymbol() }} {{ item.amount | number:'1.2-2' }}
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button class="p-2 text-slate-400 hover:text-indigo-600 transition-colors hover:bg-indigo-50 rounded-lg mr-1">
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button (click)="deletePurchase(item.id)" class="p-2 text-slate-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg" title="Delete Purchase">
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
              } @empty {
                <tr>
                    <td colspan="5" class="py-20 text-center">
                        <div class="flex flex-col items-center justify-center text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                            <h3 class="text-lg font-bold text-slate-700">No purchases found</h3>
                            <p class="text-slate-500 max-w-xs mx-auto mt-1">Start by adding a new purchase record.</p>
                        </div>
                    </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <!-- Pagination (Static for UI) -->
        <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span class="text-xs text-slate-500 font-medium">Showing {{ purchases().length }} results</span>
            <div class="flex gap-2">
                <button class="px-3 py-1 border border-slate-200 rounded-lg bg-white text-xs text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50">Previous</button>
                <button class="px-3 py-1 border border-slate-200 rounded-lg bg-white text-xs text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50">Next</button>
            </div>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class PurchaseComponent implements OnInit {
  settingsService = inject(SettingsService);
  dashboardDataService = inject(DashboardDataService);
  purchases = signal<any[]>([]);

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.dashboardDataService.getPurchases().subscribe(data => {
      this.purchases.set(data);
    });
  }

  deletePurchase(id: number) {
    if (confirm('Are you sure you want to delete this purchase?')) {
      this.dashboardDataService.deletePurchase(id).subscribe({
        next: () => {
          this.purchases.update(prev => prev.filter(p => p.id !== id));
        },
        error: (err: any) => console.error('Failed to delete purchase', err)
      });
    }
  }
}
