import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, LucideAngularModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';

  constructor(private authService: AuthService) {}

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get userEmail(): string | null {
    return this.authService.getUserEmail();
  }

  get workspaceName(): string {
    const email = this.userEmail || '';
    if (!email) return 'Workspace Principal';
    const domain = email.split('@')[1];
    if (domain) {
      const name = domain.split('.')[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return 'Workspace Principal';
  }

  get userInitials(): string {
    const email = this.userEmail || 'US';
    return email.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    window.location.reload();
  }
}
