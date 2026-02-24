import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnitPriceInterface, UnitPriceService } from '../../services/unit-price.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';

@Component({
  selector: 'app-unit-price',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './unit-price.html',
  styleUrl: './unit-price.css',
})
export class UnitPrice implements OnInit {
  private unitPriceService = inject(UnitPriceService);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationDialogService);
  unitPrices = signal<UnitPriceInterface[]>([]);
  isFormOpen = signal(false);
  editingId = signal<number | null>(null);

  formModel: Omit<UnitPriceInterface, 'id'> = {
    country: '',
    sea_price: 0,
    air_price: 0,
    bill_charge: 0,
    packing_charge: 0,
  };

  ngOnInit(): void {
    this.unitPriceService.getUnitPrice().subscribe((res: any) => {
      const list = Array.isArray(res) ? res : (res?.unit_prices ?? []);
      this.unitPrices.set(list);
    });
  }

  openAddForm(): void {
    this.editingId.set(null);
    this.formModel = { country: '', sea_price: 0, air_price: 0, bill_charge: 0, packing_charge: 0 };
    this.isFormOpen.set(true);
  }

  openEditForm(entry: UnitPriceInterface): void {
    this.editingId.set(entry.id);
    this.formModel = {
      country: entry.country,
      sea_price: entry.sea_price,
      air_price: entry.air_price,
      bill_charge: entry.bill_charge,
      packing_charge: entry.packing_charge,
    };
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingId.set(null);
  }

  async saveForm(): Promise<void> {
    const payload = {
      country: this.formModel.country?.trim(),
      sea_price: Number(this.formModel.sea_price),
      air_price: Number(this.formModel.air_price),
      bill_charge: Number(this.formModel.bill_charge),
      packing_charge: Number(this.formModel.packing_charge),
    };

    if (!payload.country) return;

    const isEditing = this.editingId() !== null;
    const confirmed = await this.confirmationService.confirm({
      title: isEditing ? 'Update Unit Price' : 'Create Unit Price',
      message: `Are you sure you want to ${isEditing ? 'update' : 'create'} the unit price for ${payload.country}?`,
      confirmText: isEditing ? 'Update' : 'Create',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    if (isEditing) {
      const id = this.editingId()!;
      this.unitPriceService.updateUnitPrice(id, payload).subscribe({
        next: (res: any) => {
          const updated = res?.unit_price;
          this.unitPrices.update((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...(updated || payload) } : item))
          );
          this.toastService.show('Unit price updated successfully', 'success');
          this.closeForm();
        },
        error: (err: any) => {
          const errMsg = err?.error?.message || 'Failed to update unit price';
          this.toastService.show(errMsg, 'error');
        }
      });
    } else {
      this.unitPriceService.createUnitPrice(payload).subscribe({
        next: (res: any) => {
          const created = res?.unit_price;
          if (created) {
            this.unitPrices.update((prev) => [...prev, created]);
          }
          this.toastService.show('Unit price created successfully', 'success');
          this.closeForm();
        },
        error: (err: any) => {
          const errMsg = err?.error?.message || 'Failed to create unit price';
          this.toastService.show(errMsg, 'error');
        }
      });
    }
  }
}
