import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Shipment, ShipmentService } from '../../services/shipment.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';

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
  confirmationService = inject(ConfirmationDialogService);

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

  async toggleCreateMode(): Promise<void> {
    if (this.isCreating) {
      const hasUnsaved = this.shipmentForm.dirty || this.isEditing;
      if (hasUnsaved) {
        const confirmed = await this.confirmationService.confirm({
          title: 'Unsaved Changes',
          message: 'You have an unsaved shipment form. Discard changes?',
          confirmText: 'Discard',
          cancelText: 'Stay'
        });
        if (!confirmed) return;
      }
    }

    this.isCreating = !this.isCreating;
    this.isEditing = false;
    this.editingId = null;
    this.shipmentForm.reset({ status: 'Pending' });
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

  async onSubmit() {
    if (this.shipmentForm.invalid) return;
    if (this.isLoading) return;

    const confirmed = await this.confirmationService.confirm({
      title: this.isEditing ? 'Update Shipment' : 'Create Shipment',
      message: `Are you sure you want to ${this.isEditing ? 'update' : 'create'} this shipment?`,
      confirmText: this.isEditing ? 'Update' : 'Create',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

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

  async deleteShipment(id: number) {
    const shipment = this.shipments().find(s => s.id === id);
    const today = new Date().toISOString().split('T')[0];
    const shipmentDate = shipment?.created_at ? shipment.created_at.split('T')[0].split(' ')[0] : null;

    if (shipmentDate && shipmentDate !== today) {
      await this.confirmationService.alert({
        title: 'Action Restricted',
        message: 'You cannot delete this shipment because the daily report for that day has already been calculated. Only shipments from today can be deleted.',
        confirmText: 'OK'
      });
      return;
    }

    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Shipment',
      message: 'Are you sure you want to delete this shipment? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      this.shipmentService.deleteShipment(id).subscribe({
        next: () => this.loadShipments(),
        error: (err: any) => console.error('Error deleting shipment', err)
      });
    }
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.isCreating) return true;
    if (!this.shipmentForm.dirty && !this.isEditing) return true;

    return this.confirmationService.confirm({
      title: 'Unsaved Changes',
      message: 'You have an unsaved shipment form. Leave this page and discard changes?',
      confirmText: 'Leave',
      cancelText: 'Stay'
    });
  }
}
