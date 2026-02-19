import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { interval, Subscription, switchMap } from 'rxjs';
import { LiveTrackingParams } from '../../core/models/dashboard.models';

@Component({
    selector: 'app-live-tracking',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-800 tracking-tight">Live Fleet Tracking</h1>
          <p class="text-slate-500 mt-1">Real-time location of active drivers.</p>
        </div>
        <div class="flex items-center gap-2">
            <span class="relative flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span class="text-sm font-medium text-slate-600">Live Updates Active</span>
        </div>
      </div>

      <!-- Map Placeholder (Simulated) -->
      <div class="bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative h-[600px] w-full shadow-inner">
        <!-- Background Map Image Pattern -->
        <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(#64748b 1px, transparent 1px); background-size: 20px 20px;"></div>
        
        <!-- Center Marker (HQ) -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div class="h-4 w-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-xs font-bold text-slate-700 bg-white/80 px-2 py-0.5 rounded backdrop-blur-sm">HQ (Berlin)</div>
        </div>

        <!-- Driver Markers -->
        @for (driver of drivers(); track driver.driver_id) {
            <div class="absolute transition-all duration-1000 ease-linear z-20"
                 [style.left.%]="scaleLon(driver.longitude)"
                 [style.top.%]="scaleLat(driver.latitude)">
                
                <!-- Marker Icon -->
                <div class="relative group cursor-pointer">
                    <div class="h-8 w-8 bg-indigo-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h12"/></svg>
                    </div>
                    
                    <!-- Tooltip -->
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                        <div class="font-bold text-slate-800 text-sm">{{ driver.driver_name }}</div>
                        <div class="text-xs text-slate-500 mt-1 flex justify-between">
                            <span>Speed:</span>
                            <span class="font-medium text-slate-700">{{ driver.speed }} km/h</span>
                        </div>
                        <div class="text-xs text-slate-500 mt-0.5 flex justify-between">
                            <span>Status:</span>
                            <span class="font-medium text-green-600">Active</span>
                        </div>
                         <div class="text-[10px] text-slate-400 mt-2 text-right">
                            Updated: {{ driver.last_updated | date:'mediumTime' }}
                        </div>
                    </div>
                </div>
            </div>
        }
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        @for (driver of drivers(); track driver.driver_id) {
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div class="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    {{ driver.driver_name?.charAt(0) }}
                </div>
                <div>
                    <div class="font-bold text-slate-800 text-sm">{{ driver.driver_name }}</div>
                    <div class="text-xs text-slate-500">{{ driver.speed }} km/h • Heading {{ driver.heading }}°</div>
                </div>
                <div class="ml-auto text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    Track
                </div>
            </div>
        }
      </div>
    </div>
  `,
    styles: ``
})
export class LiveTrackingComponent implements OnInit, OnDestroy {
    private dashboardDataService = inject(DashboardDataService);
    drivers = signal<LiveTrackingParams[]>([]);
    private updateSubscription?: Subscription;

    // Mock scaling for demo map (Berlin/Europe center approx)
    // Lat: 45 to 55 maps to 100% height
    // Lon: 5 to 15 maps to 100% width
    scaleLat(lat: number): number {
        const minLat = 55;
        const maxLat = 45;
        return ((lat - minLat) / (maxLat - minLat)) * 100;
    }

    scaleLon(lon: number): number {
        const minLon = 5;
        const maxLon = 15;
        return ((lon - minLon) / (maxLon - minLon)) * 100;
    }

    ngOnInit() {
        // Initial fetch
        this.fetchData();

        // Poll every 5 seconds
        this.updateSubscription = interval(5000).pipe(
            switchMap(() => this.dashboardDataService.getLiveTrackingLocations())
        ).subscribe(data => {
            this.drivers.set(data);
        });
    }

    fetchData() {
        this.dashboardDataService.getLiveTrackingLocations().subscribe(data => {
            this.drivers.set(data);
        });
    }

    ngOnDestroy() {
        this.updateSubscription?.unsubscribe();
    }
}
