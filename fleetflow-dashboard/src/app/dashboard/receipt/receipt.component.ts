import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 class="text-3xl font-bold text-slate-800 tracking-tight">Receipts</h1>
           <p class="text-slate-500 mt-1">Manage and track incoming receipts.</p>
        </div>
        <button class="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Receipt
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input type="text" class="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all hover:bg-white" placeholder="Search receipts...">
        </div>
        <div class="flex gap-2">
             <input type="date" class="px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-white transition-colors">
        </div>
      </div>

      <!-- Receipts Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Receipt #</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Description</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                <th class="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (item of receipts(); track item.id) {
                <tr class="hover:bg-slate-50/50 transition-colors group">
                    <td class="px-6 py-4">
                        <span class="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {{ item.receipt_number }}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-800 font-medium">
                        {{ item.description || 'No description' }}
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-600">
                        {{ item.date | date:'mediumDate' }}
                    </td>
                    <td class="px-6 py-4 text-right text-sm font-bold text-slate-800">
                        {{ settingsService.currencySymbol() }} {{ item.amount | number:'1.2-2' }}
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button class="p-2 text-slate-400 hover:text-indigo-600 transition-colors hover:bg-indigo-50 rounded-lg mr-1">
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                        <button (click)="deleteReceipt(item.id)" class="p-2 text-slate-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg" title="Delete Receipt">
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                </tr>
              } @empty {
                <tr>
                    <td colspan="5" class="py-20 text-center">
                        <div class="flex flex-col items-center justify-center text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <h3 class="text-lg font-bold text-slate-700">No receipts found</h3>
                            <p class="text-slate-500 max-w-xs mx-auto mt-1">Upload or create a new receipt to get started.</p>
                        </div>
                    </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class ReceiptComponent implements OnInit {
  settingsService = inject(SettingsService);
  dashboardDataService = inject(DashboardDataService);
  receipts = signal<any[]>([]);

  ngOnInit() {
    this.dashboardDataService.getReceipts().subscribe(data => {
      this.receipts.set(data);
    });
  }

  deleteReceipt(id: number) {
    if (confirm('Are you sure you want to delete this receipt?')) {
      this.dashboardDataService.deleteReceipt(id).subscribe({
        next: () => {
          this.receipts.update(prev => prev.filter(r => r.id !== id));
        },
        error: (err: any) => console.error('Failed to delete receipt', err)
      });
    }
  }
}
