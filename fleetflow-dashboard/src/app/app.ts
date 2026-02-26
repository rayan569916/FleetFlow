import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
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
      // Find all focusable elements
      const focusableSelector = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
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
