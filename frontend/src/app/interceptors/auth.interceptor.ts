import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getIdToken();

  // Apenas anexa o cabecalho Authorization se o token existir e a requisicao for para /api/
  // Nao deve anexar para chamadas de upload direto ao S3
  if (token && req.url.includes('/api/')) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
