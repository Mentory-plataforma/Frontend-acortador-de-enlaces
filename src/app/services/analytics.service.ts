import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Analytics {
  totalLinks: number;
  totalClicks: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/stats/Mentory-linkedin`;

  getStats(): Observable<Analytics> {
    return this.http.get<Analytics>(this.apiUrl);
  }
}
