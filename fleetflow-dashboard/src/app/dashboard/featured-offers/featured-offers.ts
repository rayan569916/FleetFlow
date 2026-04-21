import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeaturedOffer, FeaturedOffersService } from '../../services/featured-offers.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-featured-offers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './featured-offers.html',
  styleUrl: './featured-offers.css',
})
export class FeaturedOffersComponent implements OnInit {
  private service = inject(FeaturedOffersService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmationDialogService);

  offers = signal<FeaturedOffer[]>([]);
  isFormOpen = signal(false);
  editingId = signal<number | null>(null);
  isSubmitting = signal(false);

  formModel = { title: '', description: '', is_active: true };
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  // Derive base URL for serving uploaded images
  private baseUrl = environment.apiBaseUrl.endsWith('/api')
    ? environment.apiBaseUrl.slice(0, -4)
    : environment.apiBaseUrl;

  ngOnInit(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    this.service.getAll().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : [];
        this.offers.set(list);
      },
      error: () => this.toast.show('Failed to load offers', 'error')
    });
  }

  openAddForm(): void {
    this.editingId.set(null);
    this.formModel = { title: '', description: '', is_active: true };
    this.selectedFile = null;
    this.previewUrl = null;
    this.isFormOpen.set(true);
  }

  openEditForm(offer: FeaturedOffer): void {
    this.editingId.set(offer.id);
    this.formModel = { title: offer.title, description: offer.description || '', is_active: offer.is_active };
    this.selectedFile = null;
    this.previewUrl = this.resolveImageUrl(offer.image_url);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingId.set(null);
    this.selectedFile = null;
    this.previewUrl = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => { this.previewUrl = e.target?.result as string; };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async saveForm(): Promise<void> {
    if (!this.formModel.title.trim()) {
      this.toast.show('Title is required', 'error');
      return;
    }
    const isEditing = this.editingId() !== null;
    if (!isEditing && !this.selectedFile) {
      this.toast.show('Please select an image', 'error');
      return;
    }

    const confirmed = await this.confirm.confirm({
      title: isEditing ? 'Update Offer' : 'Create Offer',
      message: `Are you sure you want to ${isEditing ? 'update' : 'create'} this featured offer?`,
      confirmText: isEditing ? 'Update' : 'Create',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;

    const fd = new FormData();
    fd.append('title', this.formModel.title.trim());
    fd.append('description', this.formModel.description.trim());
    fd.append('is_active', String(this.formModel.is_active));
    if (this.selectedFile) fd.append('image', this.selectedFile);

    this.isSubmitting.set(true);

    if (isEditing) {
      this.service.update(this.editingId()!, fd).subscribe({
        next: (res: any) => {
          this.offers.update(prev =>
            prev.map(o => o.id === this.editingId() ? { ...o, ...res.offer } : o)
          );
          this.toast.show('Offer updated', 'success');
          this.closeForm();
          this.isSubmitting.set(false);
        },
        error: (err: any) => {
          this.toast.show(err?.error?.message || 'Update failed', 'error');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.service.create(fd).subscribe({
        next: (res: any) => {
          if (res?.offer) this.offers.update(prev => [res.offer, ...prev]);
          this.toast.show('Offer created', 'success');
          this.closeForm();
          this.isSubmitting.set(false);
        },
        error: (err: any) => {
          this.toast.show(err?.error?.message || 'Create failed', 'error');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  async toggleOffer(offer: FeaturedOffer): Promise<void> {
    this.service.toggle(offer.id).subscribe({
      next: (res: any) => {
        this.offers.update(prev => prev.map(o => o.id === offer.id ? { ...o, is_active: res.is_active } : o));
        this.toast.show(`Offer ${res.is_active ? 'activated' : 'deactivated'}`, 'success');
      },
      error: () => this.toast.show('Toggle failed', 'error')
    });
  }

  async deleteOffer(offer: FeaturedOffer): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete Offer',
      message: `Delete "${offer.title}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    this.service.delete(offer.id).subscribe({
      next: () => {
        this.offers.update(prev => prev.filter(o => o.id !== offer.id));
        this.toast.show('Offer deleted', 'success');
      },
      error: () => this.toast.show('Delete failed', 'error')
    });
  }

  resolveImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Relative URL — prepend the backend base
    return `${this.baseUrl}${url}`;
  }
}
