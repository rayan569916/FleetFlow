import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../shared/ui/card/card.component';
import { SettingsService } from '../../services/settings.service';
import { ReportService, DailyReportData } from '../../services/report.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-trends-chart',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './trends-chart.component.html',
  styleUrl: './trends-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrendsChartComponent implements OnInit {
  settingsService = inject(SettingsService);
  private reportService = inject(ReportService);
  private authService = inject(AuthService);

  dailyReport = signal<DailyReportData | null>(null);
  isLoading = signal<boolean>(true);

  private router = inject(Router);

  ngOnInit(): void {
    this.loadDailyReport();
  }

  loadDailyReport(): void {
    this.isLoading.set(true);
    const today = new Date().toISOString().split('T')[0];
    this.reportService.getDailyReport(today).subscribe({
      next: (data) => {
        this.dailyReport.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading daily report for widget:', err);
        this.isLoading.set(false);
      }
    });
  }

  navigateToReports(): void {
    this.router.navigate(['/dashboard/reports']);
  }
}
