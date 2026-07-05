import { Injectable } from '@angular/core';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession
} from 'amazon-cognito-identity-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly userPool: CognitoUserPool | null;
  private readonly CLIENT_ID: string;

  constructor() {
    this.CLIENT_ID = environment.cognito.clientId;

    if (environment.cognito.userPoolId && environment.cognito.clientId) {
      this.userPool = new CognitoUserPool({
        UserPoolId: environment.cognito.userPoolId,
        ClientId: environment.cognito.clientId
      });
    } else {
      this.userPool = null;
    }
  }

  // Gera a URL do Cognito Hosted UI para login social com Google (Implicit Flow)
  getGoogleLoginUrl(): string {
    const domain = environment.cognito.domain.replace(/^https?:\/\//, '');
    const clientId = environment.cognito.clientId;
    const redirectUri = window.location.origin;

    return `https://${domain}/oauth2/authorize?identity_provider=Google` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&client_id=${clientId}` +
      `&scope=email+openid+profile`;
  }

  // Processa o redirect do Cognito apos o login com Google.
  // O Cognito retorna os tokens no fragment hash da URL: #id_token=...&access_token=...
  handleCognitoCallback(hash: string): void {
    if (!hash || !hash.includes('id_token='))
      return;

    const params = new URLSearchParams(hash.substring(1));
    const idToken = params.get('id_token');
    const accessToken = params.get('access_token');

    if (!idToken || !accessToken)
      return;

    try {
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      const username = payload['cognito:username'] || payload['sub'];
      const email = payload['email'] || '';

      if (!username)
        return;

      // Persiste tokens no formato esperado pelo SDK amazon-cognito-identity-js
      localStorage.setItem(
        `CognitoIdentityServiceProvider.${this.CLIENT_ID}.LastAuthUser`,
        username
      );
      localStorage.setItem(
        `CognitoIdentityServiceProvider.${this.CLIENT_ID}.${username}.idToken`,
        idToken
      );
      localStorage.setItem(
        `CognitoIdentityServiceProvider.${this.CLIENT_ID}.${username}.accessToken`,
        accessToken
      );

      // Persiste email para uso na UI
      localStorage.setItem('user_email', email || username);

      // Limpa o hash da URL para nao reprocessar no proximo load
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {
      console.error('Erro ao processar callback do Cognito:', e);
    }
  }

  // Retorna o id_token JWT atual (real do Cognito ou bypass local)
  getIdToken(): string | null {
    // Bypass local: usado quando Cognito nao esta configurado
    const bypassToken = localStorage.getItem('jwt_token');
    if (bypassToken)
      return bypassToken;

    // Token real do Cognito
    const lastUser = localStorage.getItem(
      `CognitoIdentityServiceProvider.${this.CLIENT_ID}.LastAuthUser`
    );

    if (!lastUser)
      return null;

    return localStorage.getItem(
      `CognitoIdentityServiceProvider.${this.CLIENT_ID}.${lastUser}.idToken`
    );
  }

  // Retorna true se houver sessao ativa (bypass local ou Cognito real)
  isLoggedIn(): boolean {
    return this.getIdToken() !== null;
  }

  // Retorna o email do usuario logado
  getUserEmail(): string | null {
    return localStorage.getItem('user_email');
  }

  // Logout: limpa sessao Cognito e chaves de bypass local
  logout(): void {
    if (this.userPool) {
      const cognitoUser = this.userPool.getCurrentUser();
      if (cognitoUser)
        cognitoUser.signOut();
    }

    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_email');

    const lastUser = localStorage.getItem(
      `CognitoIdentityServiceProvider.${this.CLIENT_ID}.LastAuthUser`
    );

    if (lastUser) {
      localStorage.removeItem(`CognitoIdentityServiceProvider.${this.CLIENT_ID}.${lastUser}.idToken`);
      localStorage.removeItem(`CognitoIdentityServiceProvider.${this.CLIENT_ID}.${lastUser}.accessToken`);
      localStorage.removeItem(`CognitoIdentityServiceProvider.${this.CLIENT_ID}.LastAuthUser`);
    }
  }

  // Login por email/senha via Cognito (mantido para uso futuro ou fallback)
  login(email: string, password: string): Promise<CognitoUserSession> {
    if (!this.userPool)
      return Promise.reject(new Error('Cognito nao configurado. Use o bypass local.'));

    return new Promise((resolve, reject) => {
      const authDetails = new AuthenticationDetails({ Username: email, Password: password });
      const cognitoUser = new CognitoUser({ Username: email, Pool: this.userPool! });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (session) => {
          localStorage.setItem('user_email', email);
          resolve(session);
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  }

  // Bypass local: gera um fake JWT para testes sem Cognito configurado
  bypassLogin(email: string = 'demo@imobapp.com.br'): void {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      email,
      sub: 'user_bypass',
      exp: Math.floor(Date.now() / 1000) + 3600
    }));
    const fakeToken = `${header}.${payload}.fake_signature`;

    localStorage.setItem('jwt_token', fakeToken);
    localStorage.setItem('user_email', email);
  }
}
