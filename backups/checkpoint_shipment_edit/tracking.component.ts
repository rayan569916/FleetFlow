import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../services/dashboard-data.service';

interface TimelineEvent {
    status: string;
    location: string;
    timestamp: string;
    description: string;
    completed: boolean;
    icon?: string;
}

interface ShipmentDetails {
    id: string;
    tracking_number: string;
    status: string;
    origin: string;
    destination: string;
    estimated_delivery: string;
    current_location: string;
    serviceType?: string;
    weight?: string;
    timeline?: TimelineEvent[];
}

@Component({
    selector: 'app-tracking',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="max-w-3xl mx-auto space-y-8">
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold text-slate-800">Track Your Shipment</h1>
        <p class="text-slate-500">Enter your tracking number to get real-time updates.</p>
      </div>

      <!-- Search Box -->
      <div class="bg-white p-2 rounded-2xl shadow-lg shadow-indigo-100 border border-slate-200 flex items-center gap-2 max-w-xl mx-auto">
        <div class="pl-4 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input 
            type="text" 
            [(ngModel)]="trackingNumber" 
            (keyup.enter)="trackShipment()"
            placeholder="e.g. TRK-987654321" 
            class="flex-1 py-3 bg-transparent border-none focus:ring-0 text-lg font-medium placeholder-slate-400 text-slate-800">
        <button 
            (click)="trackShipment()"
            [disabled]="loading()"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed">
            {{ loading() ? 'Tracking...' : 'Track' }}
        </button>
      </div>

      <!-- Error Message -->
      @if (error()) {
        <div class="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium border border-red-100 animate-in fade-in slide-in-from-top-2">
            {{ error() }}
        </div>
      }

      <!-- Results -->
      @if (shipment(); as data) {
      <div class="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        <!-- Header -->
        <div class="bg-slate-50 border-b border-slate-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <div class="text-sm font-bold text-slate-400 uppercase tracking-wider">Tracking Number</div>
                <div class="text-2xl font-black text-slate-800">{{ data.tracking_number }}</div>
            </div>
            <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span class="relative flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span class="font-bold text-green-700">{{ data.status }}</span>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="p-8 pb-0">
            <div class="relative">
                <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-100">
                    <div class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-1000" style="width: 65%"></div>
                </div>
                <div class="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <div class="text-indigo-600">Picked Up</div>
                    <div class="text-indigo-600">In Transit</div>
                    <div class="">Out for Delivery</div>
                    <div class="">Delivered</div>
                </div>
            </div>
        </div>

        <!-- Details Grid -->
        <div class="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="space-y-6">
                <!-- Origin -->
                <div class="flex items-start gap-4">
                    <div class="mt-1 p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div>
                        <div class="text-sm font-bold text-slate-400">Origin</div>
                        <div class="text-lg font-bold text-slate-800">{{ data.origin }}</div>
                        <div class="text-sm text-slate-500">Warehouse A-12</div>
                    </div>
                </div>
                <!-- Destination -->
                <div class="flex items-start gap-4">
                    <div class="mt-1 p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11V3" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 21h14" /></svg>
                    </div>
                    <div>
                        <div class="text-sm font-bold text-slate-400">Destination</div>
                        <div class="text-lg font-bold text-slate-800">{{ data.destination }}</div>
                        <div class="text-sm text-slate-500">Distribution Center</div>
                    </div>
                </div>
            </div>

            <div class="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div class="flex justify-between items-center">
                    <span class="text-slate-500 font-medium">Estimated Delivery</span>
                    <span class="font-bold text-slate-800">{{ data.estimated_delivery || 'Calculating...' }}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-slate-500 font-medium">Current Location</span>
                    <span class="font-bold text-slate-800">{{ data.current_location }}</span>
                </div>
                 <div class="flex justify-between items-center">
                    <span class="text-slate-500 font-medium">Service Type</span>
                    <span class="font-bold text-slate-800">Standard Freight</span>
                </div>
            </div>
        </div>
      </div>
      }
      
       <!-- No Reuslts / Initial State Helper -->
       <div *ngIf="!shipment() && !loading() && !error()" class="text-center py-12">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <h3 class="text-lg font-bold text-slate-800">Enter a Tracking Number</h3>
            <p class="text-slate-500">Please enter a tracking number above to see shipment details.</p>
       </div>
    </div>
  `,
    styles: ``
})
export class TrackingComponent {
    private dashboardDataService = inject(DashboardDataService);

    trackingNumber = signal('');
    shipment = signal<any>(null);
    loading = signal(false);
    error = signal('');

    trackShipment() {
        if (!this.trackingNumber()) {
            this.error.set('Please enter a tracking number.');
            return;
        }

        this.loading.set(true);
        this.error.set('');
        this.shipment.set(null);

        this.dashboardDataService.getTrackingInfo(this.trackingNumber()).subscribe({
            next: (data: any) => {
                this.shipment.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('Tracking number not found. Please check and try again.');
                this.loading.set(false);
            }
        });
    }
}
