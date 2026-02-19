import { Injectable, signal, computed } from '@angular/core';

export interface AppSettings {
    language: string;
    currency: string; // 'INR', 'USD', 'SAR'
    notifications: boolean;
    maintenanceMode: boolean; // Persisted locally for demo
    debugLogging: boolean;    // Persisted locally for demo
}

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private readonly STORAGE_KEY = 'captain_cargo_settings';

    settings = signal<AppSettings>(this.loadSettings());

    constructor() { }

    private loadSettings(): AppSettings {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        const defaults: AppSettings = {
            language: 'en',
            currency: 'USD',
            notifications: true,
            maintenanceMode: false,
            debugLogging: false
        };

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return { ...defaults, ...parsed };
            } catch (e) {
                console.error('Error parsing saved settings, reverting to defaults', e);
                return defaults;
            }
        }
        return defaults;
    }

    updateSettings(newSettings: Partial<AppSettings>) {
        const current = this.settings();
        const updated = { ...current, ...newSettings };
        this.settings.set(updated);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    }

    getSettings() {
        return this.settings();
    }

    currencySymbol = computed(() => {
        const currency = this.settings().currency;
        switch (currency) {
            case 'INR': return '₹';
            case 'SAR': return 'SAR ';
            case 'USD': default: return '$';
        }
    });
}
