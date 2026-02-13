import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { TrendPoint } from '../../core/models/dashboard.models';
import { CardComponent } from '../../shared/ui/card/card.component';

interface ChartPoint {
  month: string;
  value: number;
  label: string;
  x: number;
  y: number;
}

@Component({
  selector: 'app-trends-chart',
  standalone: true,
  imports: [CardComponent],
  templateUrl: './trends-chart.component.html',
  styleUrl: './trends-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrendsChartComponent {
  readonly trendPoints = input.required<TrendPoint[]>();

  readonly width = 600;
  readonly height = 250;
  readonly padding = 20;
  readonly hoveredPoint = signal<ChartPoint | null>(null);

  readonly mappedPoints = computed<ChartPoint[]>(() => {
    const points = this.trendPoints();
    if (!points.length) {
      return [];
    }

    const maxValue = Math.max(...points.map((point) => point.value));
    const xStep = (this.width - this.padding * 2) / (points.length - 1);

    return points.map((point, index) => ({
      ...point,
      x: this.padding + index * xStep,
      y: this.height - this.padding - (point.value / maxValue) * (this.height - this.padding * 2)
    }));
  });

  readonly linePath = computed(() => this.generatePath(this.mappedPoints(), false));
  readonly areaPath = computed(() => this.generatePath(this.mappedPoints(), true));

  onPointEnter(point: ChartPoint): void {
    this.hoveredPoint.set(point);
  }

  onPointLeave(): void {
    this.hoveredPoint.set(null);
  }

  trackByMonth(index: number): number {
    return index;
  }

  private generatePath(points: ChartPoint[], area: boolean): string {
    if (!points.length) {
      return '';
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let index = 0; index < points.length - 1; index++) {
      const current = points[index];
      const next = points[index + 1];
      const controlX = (current.x + next.x) / 2;
      path += ` Q ${controlX} ${current.y}, ${next.x} ${next.y}`;
    }

    if (area) {
      path += ` L ${points[points.length - 1].x} ${this.height - this.padding}`;
      path += ` L ${points[0].x} ${this.height - this.padding} Z`;
    }

    return path;
  }
}
