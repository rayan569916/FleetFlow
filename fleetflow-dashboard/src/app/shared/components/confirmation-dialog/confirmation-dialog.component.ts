import { Component, inject, effect, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogService } from '../../../services/confirmation-dialog.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.css',
  animations: [
    trigger('fade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(20px)', opacity: 0 }))
      ])
    ])
  ]
})
export class ConfirmationDialogComponent {
  private dialogService = inject(ConfirmationDialogService);
  state = this.dialogService.state;

  @ViewChild('confirmBtn') confirmBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('cancelBtn') cancelBtn?: ElementRef<HTMLButtonElement>;

  constructor() {
    // Automatically focus the confirm button when the dialog opens
    effect(() => {
      const currentState = this.state();
      if (currentState) {
        // Wait for animation frame to ensure element is rendered
        requestAnimationFrame(() => {
          this.confirmBtn?.nativeElement.focus();
        });
      }
    });
  }

  // Helper because ViewChild is not a signal, but we want it in the effect
  private get confirmBtnEl() { return this.confirmBtn?.nativeElement; }
  private get cancelBtnEl() { return this.cancelBtn?.nativeElement; }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.state()) return;

    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.onConfirm();
        break;
      case 'Escape':
        event.preventDefault();
        this.onCancel();
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        event.preventDefault();
        this.toggleFocus();
        break;
    }
  }

  private toggleFocus() {
    const confirm = this.confirmBtn?.nativeElement;
    const cancel = this.cancelBtn?.nativeElement;

    if (!cancel) return; // Only one button (alert mode), nothing to toggle

    if (document.activeElement === confirm) {
      cancel.focus();
    } else {
      confirm?.focus();
    }
  }

  onConfirm() {
    this.dialogService.handleConfirm();
  }

  onCancel() {
    this.dialogService.handleCancel();
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.onCancel();
    }
  }
}
