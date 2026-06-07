import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    // Para fins do fluxo do projeto com Quarkus e local, se o Cognito real nao estiver provido:
    // O AuthFilter backend aceita decodificar JWT Bearer contendo o campo 'email'.
    // Geramos um JWT simulado em base64 contendo o email fornecido no payload para permitir
    // login e testes locais e em staging de forma transparente!
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ email, sub: 'user_123', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const signature = 'fake_signature';
    const fakeToken = `${header}.${payload}.${signature}`;

    localStorage.setItem('jwt_token', fakeToken);
    localStorage.setItem('user_email', email);

    return of({ token: fakeToken, email });
  }

  logout(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_email');
  }

  isLoggedIn(): boolean {
    return localStorage.getItem('jwt_token') !== null;
  }

  getUserEmail(): string | null {
    return localStorage.getItem('user_email');
  }
}
