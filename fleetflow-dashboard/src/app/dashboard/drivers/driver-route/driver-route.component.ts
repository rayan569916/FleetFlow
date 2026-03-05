import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardDataService } from '../../../services/dashboard-data.service';
import { ConfirmationDialogService } from '../../../services/confirmation-dialog.service';

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
  private confirmationService = inject(ConfirmationDialogService);

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
        this.calculateMetrics();
      });
    }
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
    alert('Route updated locally.');
  }

  async cancelEdit() {
    const confirmed = await this.confirmationService.confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved route changes. Discard them?',
      confirmText: 'Discard',
      cancelText: 'Stay'
    });

    if (!confirmed) return;

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
    this.totalDistance = Math.floor(this.stops.length * 42.5);
    const etaMinutes = Math.round((this.totalDistance / 40) * 60); // 40 km/h average
    const hours = Math.floor(etaMinutes / 60);
    const minutes = etaMinutes % 60;
    this.eta = `${hours}h ${minutes}m`;
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.isEditing) return true;

    return this.confirmationService.confirm({
      title: 'Unsaved Changes',
      message: 'Route edit is still in progress. Leave this page and discard changes?',
      confirmText: 'Leave',
      cancelText: 'Stay'
    });
  }
}
