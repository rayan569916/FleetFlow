import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 h-full transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:border-indigo-100" [class]="extraClass()">
      <ng-content></ng-content>
    </div>
  `,
  styleUrl: './card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardComponent {
  readonly extraClass = input<string>('');
}
