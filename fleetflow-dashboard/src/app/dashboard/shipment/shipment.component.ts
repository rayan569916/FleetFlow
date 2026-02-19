import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Shipment, ShipmentService } from '../../services/shipment.service';

@Component({
  selector: 'app-shipment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './shipment.component.html',
  styles: ``
})
export class ShipmentComponent implements OnInit {
  shipmentService = inject(ShipmentService);
  fb = inject(FormBuilder);

  shipments = signal<Shipment[]>([]);
  isCreating = false;
  isEditing = false;
  editingId: number | null = null;
  isLoading = false;

  shipmentForm: FormGroup = this.fb.group({
    tracking_number: ['', Validators.required],
    carrier: [''],
    origin: [''],
    destination: [''],
    estimated_delivery: [''],
    status: ['Pending']
  });

  ngOnInit() {
    this.loadShipments();
  }

  loadShipments() {
    this.shipmentService.getShipments().subscribe({
      next: (data) => this.shipments.set(data),
      error: (err) => console.error('Error loading shipments', err)
    });
  }

  toggleCreateMode() {
    this.isCreating = !this.isCreating;
    this.isEditing = false;
    this.editingId = null;
    if (!this.isCreating) {
      this.shipmentForm.reset({ status: 'Pending' });
    } else {
      this.shipmentForm.reset({ status: 'Pending' });
    }
  }

  editShipment(shipment: Shipment) {
    this.isCreating = true;
    this.isEditing = true;
    this.editingId = shipment.id!;

    // Format date for input[type="date"]
    let formattedDate = '';
    if (shipment.estimated_delivery) {
      formattedDate = shipment.estimated_delivery.split(' ')[0];
    }

    this.shipmentForm.patchValue({
      tracking_number: shipment.tracking_number,
      carrier: shipment.carrier,
      origin: shipment.origin,
      destination: shipment.destination,
      estimated_delivery: formattedDate,
      status: shipment.status
    });
  }

  onSubmit() {
    if (this.shipmentForm.invalid) return;

    this.isLoading = true;

    if (this.isEditing && this.editingId) {
      this.shipmentService.updateShipment(this.editingId, this.shipmentForm.value).subscribe({
        next: () => {
          this.isLoading = false;
          this.isCreating = false;
          this.isEditing = false;
          this.editingId = null;
          this.shipmentForm.reset({ status: 'Pending' });
          this.loadShipments();
        },
        error: (err: any) => {
          console.error('Error updating shipment', err);
          this.isLoading = false;
        }
      });
    } else {
      this.shipmentService.createShipment(this.shipmentForm.value).subscribe({
        next: () => {
          this.isLoading = false;
          this.isCreating = false;
          this.shipmentForm.reset({ status: 'Pending' });
          this.loadShipments();
        },
        error: (err: any) => {
          console.error('Error creating shipment', err);
          this.isLoading = false;
        }
      });
    }
  }

  deleteShipment(id: number) {
    if (confirm('Are you sure?')) {
      this.shipmentService.deleteShipment(id).subscribe({
        next: () => this.loadShipments(),
        error: (err: any) => console.error('Error deleting shipment', err)
      });
    }
  }
}
