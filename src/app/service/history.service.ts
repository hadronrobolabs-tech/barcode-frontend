import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private apiUrl = `${environment.BASE_URL}/api/history`;

  constructor(private http: HttpClient) {}

  getHistory(filters?: {
    barcode_id?: number;
    scanned_by?: number;
    scan_action?: string;
    status?: string;
    search?: string;
    kit_id?: number;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
    include_all?: boolean;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (value !== undefined) {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get(this.apiUrl, { params });
  }

  getStatistics(filters?: {
    scanned_by?: number;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (value !== undefined) {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get(`${this.apiUrl}/statistics`, { params });
  }

  getStats(filters?: {
    user_id?: number;
    component_id?: number;
    scan_action?: string;
    start_date?: string;
    end_date?: string;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (value !== undefined) {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get(`${this.apiUrl}/stats`, { params });
  }

  getBarcodeHistory(barcodeId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/barcode/${barcodeId}`);
  }

  exportHistory(filters?: {
    barcode_id?: number;
    scanned_by?: number;
    scan_action?: string;
    status?: string;
    search?: string;
    kit_id?: number;
    start_date?: string;
    end_date?: string;
  }): Observable<Blob> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (value !== undefined) {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }
}

