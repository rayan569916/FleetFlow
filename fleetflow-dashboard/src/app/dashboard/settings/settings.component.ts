import { Component, inject, Signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { SettingsService, AppSettings } from '../../services/settings.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.css'
})
export class SettingsComponent {
    private authService = inject(AuthService);
    private settingsService = inject(SettingsService);
    private toastService = inject(ToastService);
    private router = inject(Router);

    // Role-based visibility signals
    isAdminOrCEO = this.authService.isSuperAdminOrCEO;

    // Settings Signal
    settings: Signal<AppSettings> = this.settingsService.settings;

    // Mutable local state for form binding (synced with signal)
    formSettings: AppSettings = { ...this.settingsService.getSettings() };

    constructor() {
        // Update local form state when signal changes (e.g. from other tabs)
        effect(() => {
            this.formSettings = { ...this.settings() };
        });
    }

    saveSettings(): void {
        this.settingsService.updateSettings(this.formSettings);
        this.toastService.show('Settings saved successfully!', 'success');
    }

    // User Management Navigation
    viewAllUsers(): void {
        this.router.navigate(['/dashboard/users']);
    }

    manageRoles(): void {
        // Placeholder for future implementation
        this.toastService.show('Role Management is coming soon!', 'info');
    }
}
