import { ChangeDetectionStrategy, Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../shared/ui/card/card.component';
import { SettingsService } from '../../services/settings.service';
import { ReportService, DailyReportData } from '../../services/report.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Office } from '../../core/models/dashboard.models';

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
  public authService = inject(AuthService);

  dailyReport = signal<DailyReportData | null>(null);
  isLoading = signal<boolean>(true);
  offices = signal<Office[]>([]);
  selectedOfficeId = signal<number | null>(null);

  private router = inject(Router);

  ngOnInit(): void {
    if (this.authService.hasFullAccess()) {
      this.loadOffices();
    }
    this.selectedOfficeId.set(
      parseInt(localStorage.getItem('user_office_id') ?? '0')
    );
    this.loadDailyReport();
  }

  loadOffices(): void {
    this.authService.getOffices().subscribe({
      next: (data) => {
        this.offices.set(data);
      },
      error: (err) => console.error('Error loading offices:', err)
    });
  }

  onOfficeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value ? parseInt(target.value, 10) : null;
    this.selectedOfficeId.set(value);
    this.loadDailyReport();
  }

  loadDailyReport(): void {
    this.isLoading.set(true);
    const today = new Date().toISOString().split('T')[0];
    const officeId = this.selectedOfficeId();
    this.reportService.getDailyReport(today, officeId ?? undefined).subscribe({
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
