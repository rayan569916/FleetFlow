import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardDataService } from '../../../services/dashboard-data.service';

@Component({
  selector: 'app-driver-route',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 h-[calc(100vh-80px)] flex flex-col" *ngIf="driver; else notFound">
        <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
            <button (click)="goBack()" class="p-2 hover:bg-slate-200 rounded-full transition text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </button>
            <div>
            <h1 class="text-3xl font-bold text-slate-800">
                {{ isEditing ? 'Edit Route: ' : 'Tracking: ' }}{{ driver.name }}
            </h1>
            <p class="text-slate-500 text-sm flex items-center gap-2" *ngIf="!isEditing">
                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> 
                Live GPS Signal • Updated 2s ago
            </p>
            <p class="text-slate-500 text-sm" *ngIf="isEditing">
                Click on the map to add drop locations. Drag to reorder.
            </p>
            </div>
        </div>

        <!-- Action Buttons -->
            <div class="flex gap-2">
            <button *ngIf="!isEditing" (click)="enableEditMode()" 
                class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition text-sm font-semibold text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Route
            </button>
            <ng-container *ngIf="isEditing">
                    <button (click)="clearRoute()" 
                    class="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition text-sm font-semibold">
                    Clear Checkpoints
                </button>
                    <button (click)="saveRoute()" 
                    class="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-lg transition text-sm font-semibold">
                    Save Changes
                </button>
                <button (click)="cancelEdit()" 
                    class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition text-sm font-semibold">
                    Cancel
                </button>
            </ng-container>
            </div>
        </div>

        <!-- Interactive Map Container -->
        <div class="flex-1 bg-slate-200 rounded-3xl shadow-inner border border-slate-300 overflow-hidden relative isolate select-none"
            [class.cursor-crosshair]="isEditing"
            (click)="onMapClick($event)">
        
        <!-- CSS Map Background -->
        <div class="absolute inset-0 map-pattern opacity-40 pointer-events-none"></div>
        <!-- Labels (Fake Map Features) -->
        <div class="absolute top-1/4 left-1/4 text-xs font-bold text-slate-400/50 pointer-events-none tracking-widest uppercase">North District</div>
        <div class="absolute bottom-1/4 right-1/4 text-xs font-bold text-slate-400/50 pointer-events-none tracking-widest uppercase">Industrial Zone</div>
        
        <!-- Simulated Route Path (SVG) -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
            </linearGradient>
                <linearGradient id="routePendingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#94a3b8;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#cbd5e1;stop-opacity:1" />
            </linearGradient>
            </defs>
            <!-- Dynamic Path -->
            <path [attr.d]="routePath" 
                fill="none" 
                [attr.stroke]="isEditing ? 'url(#routePendingGradient)' : 'url(#routeGradient)'" 
                stroke-width="4" stroke-linecap="round" stroke-dasharray="8 4" class="route-path transition-all duration-300"/>
            
            <!-- Vehicle Marker (Only simulated if active route exists and not editing) -->
            <circle *ngIf="!isEditing && stops.length > 1" 
                [attr.cx]="vehiclePos.x + '%'" [attr.cy]="vehiclePos.y + '%'" 
                r="8" fill="#ef4444" class="vehicle-marker transition-all duration-1000 ease-linear">
                <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
            </circle>
        </svg>

        <!-- Render Stops (Pins) -->
            <ng-container *ngFor="let stop of stops; let i = index; trackBy: trackByIndex">
            <div class="absolute w-8 h-8 -ml-4 -mt-8 flex items-center justify-center cursor-pointer group hover:z-20 transition-transform hover:scale-110"
                [style.left.%]="stop.x" [style.top.%]="stop.y"
                (click)="onPinClick($event, i)">
                
                <!-- Pin Body -->
                <div class="relative w-full h-full">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full drop-shadow-md"
                            [class.text-blue-600]="i === 0"
                            [class.text-green-600]="i === stops.length - 1 && stops.length > 1"
                            [class.text-amber-500]="i > 0 && i < stops.length - 1">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5z"/>
                    </svg>
                    <span class="absolute top-1.5 left-0 right-0 text-center text-[10px] font-bold text-white leading-none pointer-events-none">
                        {{ i + 1 }}
                    </span>
                </div>

                <!-- Tooltip -->
                <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {{ stop.name || 'Stop #' + (i + 1) }}
                </div>
            </div>
            </ng-container>
        </div>
        
        <!-- Bottom Panel: Route Instructions or Telemetry -->
        <div class="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 min-h-[140px]">
            <div *ngIf="isEditing; else telemetryView" class="animate-fade-in">
                <h3 class="font-bold text-slate-800 mb-2">Route Editor Instructions</h3>
                <p class="text-slate-500 text-sm">
                    1. Tap anywhere on the map grid to place a waypoint.<br>
                    2. Tap an existing waypoint to remove it.<br>
                    3. Define the start point, intermediate drops, and final destination.<br>
                    4. Click <strong>Save Changes</strong> to activate the route.
                </p>
            </div>

            <ng-template #telemetryView>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in h-full items-center">
                    <div class="flex flex-col items-center border-r border-slate-100">
                        <span class="text-slate-400 text-xs font-bold tracking-wider uppercase">Distance</span>
                        <span class="text-2xl font-black text-slate-800">{{ totalDistance }} <span class="text-xs font-normal text-slate-500">km</span></span>
                    </div>
                    <div class="flex flex-col items-center border-r border-slate-100">
                            <span class="text-slate-400 text-xs font-bold tracking-wider uppercase">ETA</span>
                        <span class="text-2xl font-black text-slate-800">{{ eta }}</span>
                    </div>
                    <div class="flex flex-col items-center border-r border-slate-100">
                            <span class="text-slate-400 text-xs font-bold tracking-wider uppercase">Stops</span>
                        <span class="text-2xl font-black text-slate-800">{{ stops.length }}</span>
                    </div>
                    <div class="flex flex-col items-center">
                            <span class="text-slate-400 text-xs font-bold tracking-wider uppercase">Status</span>
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                        </span>
                    </div>
                </div>
            </ng-template>
        </div>

    </div>

    <ng-template #notFound>
        <div class="p-12 text-center">
        <h2 class="text-xl font-bold text-slate-800">Driver Not Found</h2>
        <button (click)="goBack()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Go Back</button>
        </div>
    </ng-template>
  `,
  styles: [`
    .map-pattern {
      background-image: 
        linear-gradient(rgba(203, 213, 225, 0.5) 1px, transparent 1px),
        linear-gradient(90deg, rgba(203, 213, 225, 0.5) 1px, transparent 1px);
      background-size: 40px 40px;
    }

    .vehicle-marker {
      filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6));
    }
    
    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class DriverRouteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dashboardDataService = inject(DashboardDataService);

  driver: any = null;

  // Route Editor State
  isEditing = false;
  stops: { x: number, y: number, name?: string }[] = [];
  originalStops: { x: number, y: number, name?: string }[] = [];

  // Telemetry State
  vehiclePos = { x: 50, y: 50 };
  totalDistance = 124;
  eta = '2h 15m';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.dashboardDataService.getDrivers().subscribe(drivers => {
        this.driver = drivers.find(d => d.id === id);
        // Simulate loading existing route
        if (this.driver) {
          this.loadMockRoute();
        }
      });
    }
  }

  loadMockRoute() {
    // Initial "Random" Route
    this.stops = [
      { x: 20, y: 30, name: 'Warehouse A' },
      { x: 50, y: 60, name: 'Client Zone B' },
      { x: 80, y: 40, name: 'Final Drop' }
    ];
    this.updateVehiclePos();
    this.calculateMetrics();
  }

  updateVehiclePos() {
    // Simple mock: vehicle is halfway between stop 1 and 2
    if (this.stops.length >= 2) {
      this.vehiclePos = {
        x: (this.stops[0].x + this.stops[1].x) / 2,
        y: (this.stops[0].y + this.stops[1].y) / 2
      };
    }
  }

  goBack() { this.router.navigate(['/dashboard/drivers']); }

  // Editor Logic
  enableEditMode() {
    this.isEditing = true;
    this.originalStops = JSON.parse(JSON.stringify(this.stops));
  }

  saveRoute() {
    this.isEditing = false;
    this.calculateMetrics();
    this.updateVehiclePos();
    // In a real app, we'd save this to backend
    alert('Route updated successfully!');
  }

  cancelEdit() {
    this.isEditing = false;
    this.stops = JSON.parse(JSON.stringify(this.originalStops));
  }

  clearRoute() {
    this.stops = [];
  }

  onMapClick(event: MouseEvent) {
    if (!this.isEditing) return;

    // Calculate percentage coordinates
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    this.stops.push({ x, y, name: `Stop #${this.stops.length + 1}` });
  }

  onPinClick(event: MouseEvent, index: number) {
    if (!this.isEditing) return;
    event.stopPropagation(); // Prevent map click

    // Remove stop
    this.stops.splice(index, 1);
  }

  get routePath(): string {
    if (this.stops.length < 2) return '';

    // Generate SVG Path command
    // M x1 y1 L x2 y2 ... 
    // Note: SVG uses viewbox so we can map % directly if viewbox was 0-100.
    // But our SVG width/height matches container. Using % in 'd' isn't valid directly.
    // Actually, we need to map 0-100 to unitless if we use viewBox="0 0 100 100" preserveAspectRatio="none"
    // Let's ensure SVG has viewBox="0 0 100 100" and preserveAspectRatio="none"

    const path = this.stops.map((stop, i) => {
      const command = i === 0 ? 'M' : 'L';
      return `${command} ${stop.x} ${stop.y}`;
    }).join(' ');

    return path;
  }

  // Helper needed for template path generation
  // We need to bind viewBox to the SVG in template to make this work 
  // Updating template to include viewBox="0 0 100 100" preserveAspectRatio="none"

  trackByIndex(index: number, item: any): number {
    return index;
  }

  calculateMetrics() {
    // Mock distance calculation based on num stops
    this.totalDistance = Math.floor(this.stops.length * 42.5);
    this.eta = `${Math.floor(this.stops.length * 0.8)}h ${Math.floor(Math.random() * 60)}m`;
  }
}
