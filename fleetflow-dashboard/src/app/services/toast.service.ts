import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    toasts = signal<Toast[]>([]);
    private idCounter = 0;

    show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) {
        const id = this.idCounter++;
        const newToast: Toast = { id, message, type, duration };

        this.toasts.update(current => [...current, newToast]);

        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }
    }

    remove(id: number) {
        this.toasts.update(current => current.filter(t => t.id !== id));
    }
}
