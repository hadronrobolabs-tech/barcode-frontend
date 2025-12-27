import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private API = `${environment.BASE_URL}/api/auth`;
  private readonly REMEMBER_ME_KEY = 'rememberMe';
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  register(data: any): Observable<any> {
    return this.http.post(`${this.API}/signup`, data);
  }

  login(data: any, rememberMe: boolean = false): Observable<any> {
    return this.http.post<any>(`${this.API}/login`, data).pipe(
      map(res => {
        if (res.success && res.data) {
          const token = res.data.token;
          const user = res.data.user;

          if (token) {
            // Store remember me preference
            if (rememberMe) {
              localStorage.setItem(this.REMEMBER_ME_KEY, 'true');
              localStorage.setItem(this.TOKEN_KEY, token);
            } else {
              sessionStorage.setItem(this.TOKEN_KEY, token);
              localStorage.removeItem(this.REMEMBER_ME_KEY);
            }
          }
          if (user) {
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem(this.USER_KEY, JSON.stringify(user));
          }
        }
        return res;
      })
    );
  }

  getToken(): string | null {
    // Check if remember me is enabled
    const rememberMe = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
    if (rememberMe) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return sessionStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): any {
    const rememberMe = localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
    const userStr = rememberMe 
      ? localStorage.getItem(this.USER_KEY)
      : sessionStorage.getItem(this.USER_KEY) || localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Check if token is expired (basic check for JWT)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      if (Date.now() > expiry) {
        this.logout();
        return false;
      }
    } catch (e) {
      // If token parsing fails, assume it's valid (backend will validate)
    }

    return !!token;
  }

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REMEMBER_ME_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/login']);
  }

  isRememberMeEnabled(): boolean {
    return localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
  }
}
