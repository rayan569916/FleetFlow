import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';

interface OfficeEntry {
  id: number;
  name: string;
  location: string | null;
  office_type: string | null;
}

@Component({
  selector: 'app-offices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './offices.html',
  styleUrl: './offices.css',
})
export class OfficesComponent implements OnInit {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationDialogService);

  readonly offices = signal<OfficeEntry[]>([]);
  readonly isLoading = signal(false);
  readonly isFormOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  private initialFormModel = '';

  formModel = {
    name: '',
    location: '',
    office_type: '',
  };

  ngOnInit(): void {
    this.loadOffices();
  }

  loadOffices(): void {
    this.isLoading.set(true);
    this.authService.getOffices().subscribe({
      next: (offices) => {
        const list = Array.isArray(offices) ? offices : [];
        this.offices.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.show('Failed to load offices', 'error');
        this.isLoading.set(false);
      },
    });
  }

  openForm(): void {
    this.editingId.set(null);
    this.formModel = { name: '', location: '', office_type: '' };
    this.initialFormModel = JSON.stringify(this.formModel);
    this.isFormOpen.set(true);
  }

  openEditForm(office: OfficeEntry): void {
    this.editingId.set(office.id);
    this.formModel = {
      name: office.name,
      location: office.location || '',
      office_type: office.office_type || '',
    };
    this.initialFormModel = JSON.stringify(this.formModel);
    this.isFormOpen.set(true);
  }

  async closeForm(skipConfirm = false): Promise<void> {
    if (!skipConfirm && this.isFormOpen() && JSON.stringify(this.formModel) !== this.initialFormModel) {
      const confirmed = await this.confirmationService.confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved office changes. Discard them?',
        confirmText: 'Discard',
        cancelText: 'Stay'
      });
      if (!confirmed) return;
    }

    this.isFormOpen.set(false);
    this.editingId.set(null);
    this.formModel = { name: '', location: '', office_type: '' };
    this.initialFormModel = '';
  }

  async saveOffice(): Promise<void> {
    const payload = {
      name: this.formModel.name.trim(),
      location: this.formModel.location.trim(),
      office_type: this.formModel.office_type || null,
    };

    if (!payload.name) {
      this.toastService.show('Office name is required', 'error');
      return;
    }

    const isEditing = this.editingId() !== null;
    const confirmed = await this.confirmationService.confirm({
      title: isEditing ? 'Update Office' : 'Create Office',
      message: `${isEditing ? 'Update' : 'Create'} office "${payload.name}"?`,
      confirmText: isEditing ? 'Update' : 'Create',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    const request$ = isEditing
      ? this.authService.updateOffice(this.editingId()!, payload)
      : this.authService.createOffice(payload);

    request$.subscribe({
      next: (response) => {
        const updatedOffice = response?.office;
        if (updatedOffice) {
          this.offices.update((prev) => {
            if (isEditing) {
              return prev
                .map((office) => (office.id === updatedOffice.id ? updatedOffice : office))
                .sort((a, b) => a.name.localeCompare(b.name));
            }
            return [...prev, updatedOffice].sort((a, b) => a.name.localeCompare(b.name));
          });
        } else {
          this.loadOffices();
        }
        this.toastService.show(
          isEditing ? 'Office updated successfully' : 'Office created successfully',
          'success'
        );
        this.closeForm(true);
      },
      error: (err) => {
        const message = err?.error?.message || (isEditing ? 'Failed to update office' : 'Failed to create office');
        this.toastService.show(message, 'error');
      },
    });
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.isFormOpen()) return true;
    if (JSON.stringify(this.formModel) === this.initialFormModel) return true;

    return this.confirmationService.confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved office changes. Leave this page and discard them?',
      confirmText: 'Leave',
      cancelText: 'Stay'
    });
  }
}
