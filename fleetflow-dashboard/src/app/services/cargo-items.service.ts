import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CargoItem {
    id: number;
    item_name: string;
    category_id: number;
    category_name: string;
}

export interface ItemCategory {
    id: number;
    category_name: string;
}

@Injectable({
    providedIn: 'root'
})
export class CargoItemsService {
    private http = inject(HttpClient);
    private apiRoot = environment.apiBaseUrl.endsWith('/api')
        ? environment.apiBaseUrl
        : `${environment.apiBaseUrl}/api`;
    private baseApiUrl = `${this.apiRoot}/item_list`;
    
    getCargoItemsList(search: string = '', categoryId?: number): Observable<{items: CargoItem[]}> {
        let params = new HttpParams();
        if (search) params = params.set('search', search);
        if (categoryId) params = params.set('category_id', categoryId.toString());
        return this.http.get<{items: CargoItem[]}>(`${this.baseApiUrl}/get_item_list`, { params });
    }

    getCategories(): Observable<ItemCategory[]> {
        return this.http.get<ItemCategory[]>(`${this.baseApiUrl}/categories`);
    }

    createCargoItem(item: Omit<CargoItem, 'id' | 'category_name'>): Observable<any> {
        return this.http.post<any>(`${this.baseApiUrl}/create`, item);
    }

    updateCargoItem(id: number, item: Partial<CargoItem>): Observable<any> {
        return this.http.put<any>(`${this.baseApiUrl}/update/${id}`, item);
    }

    deleteCargoItem(id: number): Observable<any> {
        return this.http.delete<any>(`${this.baseApiUrl}/delete/${id}`);
    }
}
