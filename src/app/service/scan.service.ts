import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ScanService {
  private apiUrl = `${environment.BASE_URL}/api/scans`;

  constructor(private http: HttpClient) {}

  scan(data: {
    barcode: string;
    box_barcode?: string;
    user_id?: number;
    parent_barcode_id?: number; // Optional: for linking child barcode to parent
  }): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }
}

