import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  readonly menuClicked = output<void>();

  onToggleSidebar(): void {
    this.menuClicked.emit();
  }
}
