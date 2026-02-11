import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BoxService {
  private apiUrl = `${environment.BASE_URL}/api/boxes`;

  constructor(private http: HttpClient) {}

  start(data: {
    kit_id: number;
    box_barcode: string;
    packed_by?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/start`, data);
  }

  getRequirements(kitId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/requirements/${kitId}`);
  }

  getStatus(boxBarcode: string): Observable<any> {
    const params = new HttpParams().set('box_barcode', boxBarcode);
    return this.http.get(`${this.apiUrl}/status`, { params });
  }

  scan(data: {
    box_barcode: string;
    item_barcode: string;
    user_id?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/scan`, data);
  }

  removeItem(data: {
    box_barcode: string;
    item_barcode: string;
    user_id?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/remove-item`, data);
  }

  complete(data: {
    box_barcode: string;
    user_id?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/complete`, data);
  }

  exportBoxPacking(filters?: {
    kit_id?: number;
    start_date?: string;
    end_date?: string;
  }): Observable<Blob> {
    // Filters are already handled in the method signature
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] !== undefined) {
          params = params.set(key, filters[key as keyof typeof filters]!.toString());
        }
      });
    }
    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }
}

