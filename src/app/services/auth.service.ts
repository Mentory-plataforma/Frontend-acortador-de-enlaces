import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  login(email: string, password: string) {
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/api/auth/login`, { email, password })
      .pipe(
        tap(res => localStorage.setItem('token', res.access_token))
      );
  }

  register(email: string, password: string, secretCode: string) {
    return this.http.post(`${this.apiUrl}/auth/register`, { email, password, secretCode });
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  getToken() {
    return localStorage.getItem('token');
  }
}
