import { ChangeDetectionStrategy, Component, HostListener, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ConfirmationDialogComponent } from './shared/components/confirmation-dialog/confirmation-dialog.component';
import { PushNotificationService } from './services/push.notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, ConfirmationDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  private router = inject(Router);
  private pushService = inject(PushNotificationService);

  ngOnInit() {
    this.pushService.subscribe();
  }

  @HostListener('input', ['$event'])
  onInput(event: any) {
    const target = event.target as HTMLInputElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    if (!isInput) return;

    // Exclude login and signup forms
    const url = this.router.url;
    if (url.includes('/login') || url.includes('/dashboard/register')) return;

    // Exclude specific types
    const type = target.type;
    if (['password', 'email', 'number', 'tel'].includes(type)) return;

    const value = target.value;
    if (value && value.length > 0) {
      const firstChar = value.charAt(0);
      if (firstChar !== firstChar.toUpperCase()) {
        const selectionStart = target.selectionStart;
        const selectionEnd = target.selectionEnd;
        
        target.value = firstChar.toUpperCase() + value.slice(1);
        
        // Restore selection/cursor position
        target.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }

  @HostListener('keydown.enter', ['$event'])
  onEnterKey(event: any) {
    this.handleNavigation(event, 1);
  }

  @HostListener('keydown.ArrowLeft', ['$event'])
  onArrowLeftKey(event: any) {
    const target = event.target as any;
    const tagName = target.tagName;
    
    if (tagName === 'SELECT') {
      this.handleNavigation(event, -1);
      return;
    }

    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
      if (target.selectionStart === 0 && target.selectionEnd === 0) {
        this.handleNavigation(event, -1);
      }
    }
  }

  @HostListener('keydown.ArrowRight', ['$event'])
  onArrowRightKey(event: any) {
    const target = event.target as any;
    const tagName = target.tagName;

    if (tagName === 'SELECT') {
      this.handleNavigation(event, 1);
      return;
    }

    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
      const valLen = target.value?.length || 0;
      if (target.selectionStart === valLen && target.selectionEnd === valLen) {
        this.handleNavigation(event, 1);
      }
    }
  }

  private handleNavigation(event: any, direction: number) {
    if (event.defaultPrevented) return;

    const target = event.target as HTMLElement;

    // Check if the target is an input-like element
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'SELECT' || 
                    target.tagName === 'TEXTAREA';

    // Don't intercept if it's a button, a link, or a submit input
    const isActionButton = target.tagName === 'BUTTON' || 
                          target.tagName === 'A' || 
                          (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'submit');

    if (isInput && !isActionButton) {
      // Find all focusables, excluding those explicitly marked with tabindex="-1"
      const focusableSelector = 'input:not([disabled]):not([tabindex="-1"]), ' +
                                'select:not([disabled]):not([tabindex="-1"]), ' +
                                'textarea:not([disabled]):not([tabindex="-1"]), ' +
                                'button:not([disabled]):not([tabindex="-1"]), ' +
                                '[tabindex]:not([tabindex="-1"])';
      const focusables = Array.from(document.querySelectorAll(focusableSelector)) as HTMLElement[];
      
      const index = focusables.indexOf(target);
      if (index > -1) {
        const nextIndex = index + direction;
        if (nextIndex >= 0 && nextIndex < focusables.length) {
          event.preventDefault(); 
          focusables[nextIndex].focus();
        }
      }
    }
  }
}
