import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FeaturedOffer {
  id: number;
  title: string;
  description: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class FeaturedOffersService {
  private apiRoot = environment.apiBaseUrl.endsWith('/api')
    ? environment.apiBaseUrl
    : `${environment.apiBaseUrl}/api`;
  private apiUrl = `${this.apiRoot}/featured_offers`;
  private http = inject(HttpClient);

  getAll(): Observable<FeaturedOffer[]> {
    return this.http.get<FeaturedOffer[]>(`${this.apiUrl}/`);
  }

  create(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/`, formData);
  }

  update(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, formData);
  }

  toggle(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
