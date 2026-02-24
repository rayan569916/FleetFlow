import { Injectable, signal } from '@angular/core';

export interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isAlert: boolean;
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationDialogService {
  state = signal<ConfirmationState | null>(null);

  confirm(options: {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      this.state.set({
        isOpen: true,
        title: options.title || 'Are you sure?',
        message: options.message || 'This action cannot be undone.',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isAlert: false,
        resolve
      });
    });
  }

  alert(options: {
    title?: string;
    message?: string;
    confirmText?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      this.state.set({
        isOpen: true,
        title: options.title || 'Attention',
        message: options.message || '',
        confirmText: options.confirmText || 'OK',
        cancelText: '',
        isAlert: true,
        resolve
      });
    });
  }

  handleConfirm() {
    const currentState = this.state();
    if (currentState) {
      currentState.resolve(true);
      this.close();
    }
  }

  handleCancel() {
    const currentState = this.state();
    if (currentState) {
      currentState.resolve(false);
      this.close();
    }
  }

  private close() {
    this.state.set(null);
  }
}
