import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, map } from 'rxjs';

export interface Analytics {
  totalLinks: number;
  totalClicks: number;
}

export type ClickFilterField =
  | 'all'
  | 'token'
  | 'user_agent'
  | 'ip'
  | 'pais'
  | 'estado'
  | 'browser'
  | 'os'
  | 'device'
  | 'referrer'
  | 'created_at'
  | 'region';

export type ClickPeriod = 'day' | 'week' | 'month';

export interface ClickAnalyticsFilters {
  field: ClickFilterField;
  value: string;
  dateFrom: string;
  dateTo: string;
  hourFrom: string;
  hourTo: string;
  period: ClickPeriod;
  timeZone: string;
}

export interface LinkClick {
  id: string;
  token: string | null;
  user_agent: string | null;
  ip: string | null;
  pais: string | null;
  estado: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  referrer: string | null;
  created_at: string;
  region: string | null;
}

export interface LinkClickDetails {
  link: { alias: string; url: string };
  totalClicks: number;
  uniqueVisitors: number;
  matchingClicks: number;
  page: number;
  pageSize: number;
  totalPages: number;
  clicks: LinkClick[];
  filterOptions: string[];
  period: ClickPeriod;
  timeZone: string;
  byBrowser: { browser: string; clicks: number; uniqueVisitors: number }[];
  byHour: { hour: number; clicks: number }[];
  byPeriod: { bucket: string; clicks: number }[];
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

  getLinkClicks(
    alias: string,
    page: number,
    filters: ClickAnalyticsFilters,
    limit = 25,
  ): Observable<LinkClickDetails> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('field', filters.field)
      .set('period', filters.period)
      .set('timeZone', filters.timeZone);
    if (filters.value.trim()) params = params.set('value', filters.value.trim());
    if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
    if (filters.hourFrom) params = params.set('hourFrom', filters.hourFrom);
    if (filters.hourTo) params = params.set('hourTo', filters.hourTo);

    return this.http
      .get<{ success: boolean; data: LinkClickDetails }>(
        `${environment.apiUrl}/api/stats/${encodeURIComponent(alias)}/clicks`,
        { params },
      )
      .pipe(map((response) => response.data));
  }
}
