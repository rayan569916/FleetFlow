import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardDataService } from '../../../services/dashboard-data.service';

@Component({
  selector: 'app-driver-route',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-route.component.html',
  styleUrl: './driver-route.component.css'
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
