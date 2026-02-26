import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DailyReportData {
    date: string;
    total_invoice_grand: number;
    bank_transfer_swipe_sum: number;
    total_payment: number;
    total_purchase: number;
    total_receipt: number;
    previous_total: number;
    daily_total: number;
    is_stored: boolean;
    office_id?: number;
    office_name?: string;
}

export interface InvoiceReportItem {
    date: string;
    invoice_number: string;
    tracking_number: string;
    mode_of_payment: string;
    grand_total: number;
    office_id: number;
    office_name: string;
    created_by_name: string;
}

export interface FinanceReportItem {
    id: number;
    amount: number;
    description: string;
    category_name: string;
    office_id: number;
    office_name: string;
    created_by_name: string;
    created_at: string;
}

export interface Category {
    id: number;
    name: string;
}

@Injectable({
    providedIn: 'root'
})
export class ReportService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiBaseUrl}/api/reports`;

    getDailyReport(date?: string, officeId?: number): Observable<DailyReportData> {
        const params: any = {};
        if (date) params.date = date;
        if (officeId) params.office_id = officeId;
        return this.http.get<DailyReportData>(`${this.apiUrl}/daily`, { params });
    }

    saveDailyReport(data: DailyReportData): Observable<any> {
        return this.http.post(`${this.apiUrl}/daily/save`, data);
    }

    getInvoiceReport(startDate: string, endDate: string, officeId?: number): Observable<InvoiceReportItem[]> {
        const params: any = { start_date: startDate, end_date: endDate };
        if (officeId) params.office_id = officeId;
        return this.http.get<InvoiceReportItem[]>(`${this.apiUrl}/invoices`, { params });
    }

    getFinanceReport(type: 'payments' | 'purchases' | 'receipts', startDate: string, endDate: string, officeId?: number, categoryId?: number): Observable<FinanceReportItem[]> {
        const params: any = { start_date: startDate, end_date: endDate };
        if (officeId) params.office_id = officeId;
        if (categoryId) params.category_id = categoryId;
        return this.http.get<FinanceReportItem[]>(`${this.apiUrl}/${type}`, { params });
    }

    getDailyReportsList(startDate: string, endDate: string, officeId?: number): Observable<DailyReportData[]> {
        const params: any = { start_date: startDate, end_date: endDate };
        if (officeId) params.office_id = officeId;
        return this.http.get<DailyReportData[]>(`${this.apiUrl}/daily-list`, { params });
    }

    getCategories(type: 'purchase' | 'receipt' | 'payment'): Observable<Category[]> {
        return this.http.get<Category[]>(`${this.apiUrl}/categories`, { params: { type } });
    }
}
