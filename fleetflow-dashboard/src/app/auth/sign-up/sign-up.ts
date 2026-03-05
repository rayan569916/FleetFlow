import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { passwordMatchValidator } from './password-match.validator';

import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { HeaderComponent } from '../../layout/header/header.component';
import { SidebarComponent } from '../../layout/sidebar/sidebar.component';
import { UiStateService } from '../../services/ui-state.service';
import { ConfirmationDialogService } from '../../services/confirmation-dialog.service';

@Component({
  selector: 'app-sign-up',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUpComponent implements OnInit {
  private static readonly STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/;

  signupForm!: FormGroup;
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  submitAttempted = signal(false);
  roles = signal<any[]>([]);
  offices = signal<any[]>([]);
  users = signal<any[]>([]);
  editingUser = signal<any | null>(null);

  currentPage = signal(1);
  pageSize = 10;
  totalItems = signal(0);
  totalPages = signal(1);

  selectedOfficeFilterId = signal<number>(0);
  selectedRoleFilterId = signal<number>(0);

  private uiStateService = inject(UiStateService);
  sidebarExpanded$ = this.uiStateService.sidebarExpanded$;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
    private confirmationService: ConfirmationDialogService
  ) { }



  ngOnInit(): void {
    this.buildForm();
    this.fetchRoles();
    this.fetchOffices();
    this.fetchUsers();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(v => !v);
  }

  private fetchUsers(): void {
    const office_id = this.selectedOfficeFilterId() || undefined;
    const role_id = this.selectedRoleFilterId() || undefined;

    this.authService.getUsers({
      page: this.currentPage(),
      per_page: this.pageSize,
      office_id,
      role_id
    }).subscribe({
      next: (data) => {
        this.users.set(data.users || []);
        this.totalItems.set(Number(data.total || 0));
        this.totalPages.set(Number(data.pages || 1) || 1);

        if (this.currentPage() > this.totalPages()) {
          this.currentPage.set(this.totalPages());
          this.fetchUsers();
        }
      },
      error: (err) => console.error('Failed to fetch users', err)
    });
  }

  private fetchRoles(): void {
    this.authService.getRoles().subscribe({
      next: (data) => {
        const mappedRoles = data.map(role => ({
          ...role,
          displayName: role.name.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        }));
        this.roles.set(mappedRoles);
      },
      error: (err) => console.error('Failed to fetch roles', err)
    });
  }

  private fetchOffices(): void {
    this.authService.getOffices().subscribe({
      next: (data) => {
        this.offices.set(data);
      },
      error: (err) => console.error('Failed to fetch offices', err)
    });
  }

  private buildForm(): void {
    this.signupForm = this.formBuilder.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      officeId: ['', Validators.required],
      password: ['', [Validators.required, Validators.pattern(SignUpComponent.STRONG_PASSWORD)]],
      ConfirmPassword: ['', [Validators.required]]
    }, {
      validators: passwordMatchValidator
    });
  }

  onSubmit() {
    this.submitAttempted.set(true);
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    const formData = this.signupForm.value;
    const registerData = {
      username: formData.email, // Mapping email to username
      full_name: formData.fullName,
      role_id: formData.role, // This will now be the numeric ID from the select
      office_id: Number(formData.officeId),
      password: String(formData.password || '').trim()
    };

    this.isLoading = true;
    const editingUserId = this.editingUser()?.id;
    if (editingUserId) {
      this.authService.updateUser(editingUserId, registerData).subscribe({
        next: () => {
          this.toastService.show('User updated successfully!', 'success');
          this.resetForm();
          this.fetchUsers();
          this.isLoading = false;
        },
        error: (err) => {
          this.toastService.show(err.error?.message || 'Update failed', 'error');
          this.isLoading = false;
        }
      });
    } else {
      this.authService.register(registerData).subscribe({
        next: (response: any) => {
          console.log('Registration successful', response);
          this.successMessage = 'User registered successfully!';
          this.errorMessage = null;
          this.toastService.show(this.successMessage || '', 'success');
          this.resetForm();
          this.fetchUsers();
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Registration failed', error);
          this.errorMessage = error.error?.message || 'Registration failed.';
          this.successMessage = null;
          this.toastService.show(this.errorMessage || '', 'error');
          this.isLoading = false;
        }
      });
    }
  }

  onEdit(user: any): void {
    this.editingUser.set(user);
    this.submitAttempted.set(false);
    const roleId = this.roles().find((r: any) => r.name === user.role)?.id;
    this.signupForm.patchValue({
      fullName: user.full_name,
      email: user.username,
      role: roleId,
      officeId: user.office_id,
      password: '',
      ConfirmPassword: ''
    });
    // Remove password requirement when editing
    this.signupForm.get('password')?.setValidators([Validators.pattern(SignUpComponent.STRONG_PASSWORD)]);
    this.signupForm.get('ConfirmPassword')?.setValidators([]);
    this.signupForm.get('password')?.updateValueAndValidity();
    this.signupForm.get('ConfirmPassword')?.updateValueAndValidity();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.fetchUsers();
  }

  async onDelete(userId: number): Promise<void> {
    const confirmed = await this.confirmationService.confirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    this.authService.deleteUser(userId).subscribe({
      next: () => {
        this.toastService.show('User deleted successfully!', 'success');
        this.fetchUsers();
      },
      error: (err) => {
        this.toastService.show(err.error?.message || 'Delete failed', 'error');
      }
    });
  }

  resetForm(): void {
    this.editingUser.set(null);
    this.signupForm.reset();
    this.buildForm(); // Re-apply validators
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
    this.submitAttempted.set(false);
    this.successMessage = null;
    this.errorMessage = null;
  }

  async cancelEdit(): Promise<void> {
    const hasUnsaved = this.signupForm.dirty || !!this.editingUser();
    if (hasUnsaved) {
      const confirmed = await this.confirmationService.confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved registration changes. Discard them?',
        confirmText: 'Discard',
        cancelText: 'Stay'
      });
      if (!confirmed) return;
    }
    this.resetForm();
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.fetchUsers();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.fetchUsers();
    }
  }

  mathMin = Math.min;

  async canDeactivate(): Promise<boolean> {
    if (!this.signupForm?.dirty && !this.editingUser()) return true;

    return this.confirmationService.confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved registration changes. Leave this page and discard them?',
      confirmText: 'Leave',
      cancelText: 'Stay'
    });
  }
}
