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
    const target = event.target as HTMLElement;

    // Check if the target is an input-like element
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'SELECT' || 
                    target.tagName === 'TEXTAREA';

    // Don't intercept Enter if it's a button, a link, or a submit input
    const isActionButton = target.tagName === 'BUTTON' || 
                          target.tagName === 'A' || 
                          (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'submit');

    if (isInput && !isActionButton) {
      // Find all focusable elements
      const focusableSelector = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusables = Array.from(document.querySelectorAll(focusableSelector)) as HTMLElement[];
      
      const index = focusables.indexOf(target);
      if (index > -1 && index < focusables.length - 1) {
        event.preventDefault(); // Prevent form submission
        focusables[index + 1].focus();
      }
    }
  }
}
