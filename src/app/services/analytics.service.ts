import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, map } from 'rxjs';

export interface Analytics {
  totalLinks: number;
  totalClicks: number;
  allLinks?: number;
  allClicks?: number;
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

// ---------------------------------------------------------------------------
// Estadísticas generales (todos los enlaces del usuario)
// ---------------------------------------------------------------------------

export type GeneralFilterField = ClickFilterField | 'alias';
export type GeneralPeriod = 'hour' | ClickPeriod;
export type LinkStatusFilter = 'all' | 'active' | 'inactive';
export type BreakdownKey = 'browser' | 'os' | 'device' | 'pais' | 'estado' | 'referrer';

export interface GeneralStatsFilters {
  field: GeneralFilterField;
  value: string;
  alias: string;
  status: LinkStatusFilter;
  dateFrom: string;
  dateTo: string;
  hourFrom: string;
  hourTo: string;
  /** ISO: 1 = lunes … 7 = domingo */
  weekdays: number[];
  period: GeneralPeriod;
  timeZone: string;
}

export interface BreakdownItem {
  label: string;
  clicks: number;
  uniqueVisitors: number;
}

export interface GeneralClick extends LinkClick {
  alias: string;
}

export interface GeneralStats {
  overview: {
    totalLinks: number;
    activeLinks: number;
    totalClicks: number;
    uniqueVisitors: number;
    clicksToday: number;
    clicksLast7Days: number;
    clicksLast30Days: number;
    firstClick: string | null;
    lastClick: string | null;
  };
  summary: {
    matchingClicks: number;
    uniqueVisitors: number;
    linksWithClicks: number;
    activeDays: number;
    avgClicksPerDay: number;
    avgClicksPerLink: number;
    firstClick: string | null;
    lastClick: string | null;
    peakHour: { hour: number; clicks: number } | null;
    peakWeekday: { weekday: number; clicks: number } | null;
    previousPeriodClicks: number | null;
    previousPeriod: { from: string; to: string } | null;
  };
  byPeriod: { bucket: string; clicks: number; uniqueVisitors: number }[];
  byHour: { hour: number; clicks: number }[];
  byWeekday: { weekday: number; clicks: number }[];
  heatmap: { weekday: number; hour: number; clicks: number }[];
  byLink: {
    alias: string;
    url: string;
    activo: boolean;
    clicks: number;
    uniqueVisitors: number;
    lastClick: string;
    share: number;
  }[];
  breakdowns: Record<BreakdownKey, BreakdownItem[]>;
  clicks: GeneralClick[];
  page: number;
  pageSize: number;
  totalPages: number;
  filterOptions: string[];
  linkOptions: { alias: string; url: string; activo: boolean }[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private generalApiUrl = `${environment.apiUrl}/api/analytics`;

  /** Resumen de las tarjetas del Dashboard (enlaces activos y clics globales). */
  getStats(): Observable<Analytics> {
    return this.http
      .get<{ success: boolean; data: Analytics }>(`${this.generalApiUrl}/summary`)
      .pipe(map((response) => response.data));
  }

  /** Estadísticas generales de TODOS los enlaces del usuario (módulo Estadísticas). */
  getGeneralStats(
    page: number,
    filters: GeneralStatsFilters,
    limit = 25,
  ): Observable<GeneralStats> {
    let params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('field', filters.field)
      .set('period', filters.period)
      .set('status', filters.status)
      .set('timeZone', filters.timeZone);
    if (filters.value.trim()) params = params.set('value', filters.value.trim());
    if (filters.alias) params = params.set('alias', filters.alias);
    if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
    if (filters.hourFrom) params = params.set('hourFrom', filters.hourFrom);
    if (filters.hourTo) params = params.set('hourTo', filters.hourTo);
    if (filters.weekdays.length) params = params.set('weekdays', filters.weekdays.join(','));

    return this.http
      .get<{ success: boolean; data: GeneralStats }>(`${this.generalApiUrl}/general`, { params })
      .pipe(map((response) => response.data));
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
