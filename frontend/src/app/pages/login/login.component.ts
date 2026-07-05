import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  errorMessage: string = '';
  loading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  loginWithGoogle(): void {
    try {
      const url = this.authService.getGoogleLoginUrl();
      window.location.href = url;
    } catch (err: any) {
      this.errorMessage = 'Cognito nao configurado. Use o Acesso Rapido para testes locais.';
      console.error('Erro ao gerar URL de login com Google:', err);
    }
  }

  bypassLogin(): void {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.authService.bypassLogin('demo@imobapp.com.br');
      this.loading = false;
      this.router.navigate(['/properties']);
    } catch (err: any) {
      this.loading = false;
      this.errorMessage = 'Erro ao realizar login de bypass.';
    }
  }
}
