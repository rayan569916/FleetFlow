import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CargoItemsService, CargoItem, ItemCategory } from '../../services/cargo-items.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-cargo-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cargo-items.html',
  styleUrl: './cargo-items.css',
})
export class CargoItems implements OnInit {
  private cargoItemsService = inject(CargoItemsService);
  private toastService = inject(ToastService);
    private confirmationService = inject(ConfirmationDialogService);

  cargoItemList = signal<CargoItem[]>([]);
  categories = signal<ItemCategory[]>([]);
  
  isFormOpen = signal(false);
  editingId = signal<number | null>(null);
  isLoading = signal(false);

  // Search and Filter
  searchTerm = '';
  selectedCategoryId = 0;
  private searchSubject = new Subject<string>();

  // Pagination
  currentPage = signal(1);
  itemsPerPage = 10;
  
  formModel: Omit<CargoItem, 'id' | 'category_name'> = {
    item_name: '',
    category_id: 0
  };

  ngOnInit(): void {
    this.loadCategories();
    this.loadItems();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage.set(1);
      this.loadItems();
    });
  }

  loadCategories(): void {
    this.cargoItemsService.getCategories().subscribe({
      next: (res) => this.categories.set(res),
      error: (err) => console.error('Error loading categories', err)
    });
  }

  loadItems(): void {
    this.isLoading.set(true);
    this.cargoItemsService.getCargoItemsList(this.searchTerm, this.selectedCategoryId || undefined).subscribe({
      next: (res) => {
        this.cargoItemList.set(res.items || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toastService.show('Failed to load items', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadItems();
  }

  openAddForm(): void {
    this.editingId.set(null);
    this.formModel = { item_name: '', category_id: this.categories()[0]?.id || 0 };
    this.isFormOpen.set(true);
  }

  openEditForm(item: CargoItem): void {
    this.editingId.set(item.id);
    this.formModel = {
      item_name: item.item_name,
      category_id: item.category_id
    };
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingId.set(null);
  }

  async saveForm(): Promise<void> {
    if (!this.formModel.item_name.trim() || !this.formModel.category_id) {
      this.toastService.show('Please fill all required fields', 'error');
      return;
    }

    const isEditing = this.editingId() !== null;
    const confirmed = await this.confirmationService.confirm({
      title: isEditing ? 'Update Item' : 'Add Item',
      message: `Are you sure you want to ${isEditing ? 'update' : 'add'} this cargo item?`,
      confirmText: isEditing ? 'Update' : 'Add',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    if (isEditing) {
      this.cargoItemsService.updateCargoItem(this.editingId()!, this.formModel).subscribe({
        next: () => {
          this.toastService.show('Item updated successfully', 'success');
          this.loadItems();
          this.closeForm();
        },
        error: () => this.toastService.show('Failed to update item', 'error')
      });
    } else {
      this.cargoItemsService.createCargoItem(this.formModel).subscribe({
        next: () => {
          this.toastService.show('Item created successfully', 'success');
          this.loadItems();
          this.closeForm();
        },
        error: () => this.toastService.show('Failed to create item', 'error')
      });
    }
  }

  async deleteItem(id: number): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    this.cargoItemsService.deleteCargoItem(id).subscribe({
      next: () => {
        this.toastService.show('Item deleted successfully', 'success');
        this.loadItems();
      },
      error: () => this.toastService.show('Failed to delete item', 'error')
    });
  }

  // Frontend Pagination Logic
  get paginatedItems(): CargoItem[] {
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.cargoItemList().slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.cargoItemList().length / this.itemsPerPage) || 1;
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  mathMin = Math.min;
}
