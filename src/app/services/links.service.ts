import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, map } from 'rxjs';

export interface Link {
  id: string;
  user_id: string;
  url: string;
  alias: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  total_clicks: string | number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class LinksService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/links`;

  getAll(): Observable<Link[]> {
    return this.http.get<ApiResponse<Link[]>>(this.apiUrl).pipe(map((response) => response.data));
  }

  create(urlToShorten: string, alias?: string): Observable<Link> {
    return this.http
      .post<ApiResponse<Link>>(this.apiUrl, { url: urlToShorten, alias })
      .pipe(map((response) => response.data));
  }

  update(alias: string, data: Partial<Link>): Observable<Link> {
    return this.http
      .put<ApiResponse<Link>>(`${this.apiUrl}/${alias}`, data)
      .pipe(map((response) => response.data));
  }

  delete(alias: string): Observable<any> {
    return this.http
      .delete<ApiResponse<any>>(`${this.apiUrl}/${alias}`)
      .pipe(map((response) => response.data));
  }
}
