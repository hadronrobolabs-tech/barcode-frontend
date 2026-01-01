import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const token = localStorage.getItem("token");

    const newReq = req.clone({
      withCredentials: false,
      setHeaders: token ? { "X-AUTH-TOKEN": token } : {}   // 🔥 Hostinger safe
    });

    return next.handle(newReq);
  }
}
