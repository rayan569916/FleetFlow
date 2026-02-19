import { Component, inject } from '@angular/core';
import { CommonModule, KeyValuePipe, DecimalPipe, AsyncPipe } from '@angular/common'; // Add AsyncPipe
import { SettingsService } from '../../services/settings.service';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [CommonModule, DecimalPipe, AsyncPipe],
  template: `
    <div class="space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold text-slate-800 tracking-tight">Income Overview</h1>
            <p class="text-slate-500 mt-1">Track revenue, expenses, and financial health.</p>
          </div>
          <div class="flex gap-3">
            <select class="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm min-w-[150px] cursor-pointer font-medium hover:border-indigo-300 transition-colors" (change)="onPeriodChange($event)">
              <option value="today">Today (Demo)</option>
              <option value="week">This Week</option>
              <option value="month" selected>This Month</option>
              <option value="year">This Year</option>
            </select>
            <button class="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
          </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" *ngIf="incomeStats$ | async as stats">
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-all group overflow-hidden relative">
            <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg class="h-16 w-16 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s5.5 1.59 5.5 4.05c0 2.47-1.82 3.42-3.44 3.86z"/></svg>
            </div>
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
              {{ stats.period }}
          </h3>
          <div class="text-3xl font-bold text-slate-800 tracking-tight">{{ settingsService.currencySymbol() }}{{ stats.value | number }}</div>
          <div class="text-sm text-emerald-600 mt-2 flex items-center font-bold bg-emerald-50 w-fit px-2 py-0.5 rounded-lg border border-emerald-100">
              <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              +4.2%
          </div>
        </div>
      </div>

      <!-- Detailed Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-800">Recent Transactions</h2>
          <button class="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-50/50 border-b border-slate-100">
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr class="hover:bg-slate-50/80 transition group cursor-pointer">
                <td class="px-6 py-4 text-slate-500 font-mono text-xs">#TRX-9821</td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-slate-700">Today</div>
                    <div class="text-xs text-slate-400">10:23 AM</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">Client Payment - Fleet A</div>
                    <div class="text-xs text-slate-400">Recurring Invoice</div>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                        Completed
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-bold text-slate-700">+{{ settingsService.currencySymbol() }}1,250.00</td>
              </tr>
              
              <tr class="hover:bg-slate-50/80 transition group cursor-pointer">
              </tr>
              
              <tr class="hover:bg-slate-50/80 transition group cursor-pointer">
                <td class="px-6 py-4 text-slate-500 font-mono text-xs">#TRX-9820</td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-slate-700">Yesterday</div>
                    <div class="text-xs text-slate-400">4:15 PM</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">Service Fee</div>
                    <div class="text-xs text-slate-400">Maintenance Charge</div>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          <span class="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse"></span>
                        Processing
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-bold text-slate-700">+{{ settingsService.currencySymbol() }}450.00</td>
              </tr>

                <tr class="hover:bg-slate-50/80 transition group cursor-pointer">
                <td class="px-6 py-4 text-slate-500 font-mono text-xs">#TRX-9819</td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-slate-700">Sep 28</div>
                    <div class="text-xs text-slate-400">09:00 AM</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">Fuel Expense Ref: 8821</div>
                    <div class="text-xs text-slate-400">Shell Station - Zone 4</div>
                </td>
                <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Cleared
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-bold text-red-500">-{{ settingsService.currencySymbol() }}2,100.50</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
            <button class="text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors">Load More Transactions</button>
        </div>
      </div>
    </div>
  `
})
export class IncomeComponent {
  settingsService = inject(SettingsService);
  dashboardDataService = inject(DashboardDataService);

  // Default to today, or user selection
  incomeStats$ = this.dashboardDataService.getSelectedIncome();

  onPeriodChange(event: any) {
    const period = event.target.value;
    this.dashboardDataService.setIncomePeriod(period);
  }
}

