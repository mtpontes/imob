import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, RouterModule, ChildrenOutletContexts, Router, NavigationEnd } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { AuthService } from './services/auth.service';
import { WorkspaceService } from './services/workspace.service';
import { WorkspaceResponse } from './types';
import { LucideAngularModule } from 'lucide-angular';
import { routeAnimations, dropdownTrigger } from './animations/animations';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, LucideAngularModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  animations: [routeAnimations, dropdownTrigger]
})
export class AppComponent implements OnInit {
  title = 'frontend';
  isProfileMenuOpen = false;
  isWorkspaceMenuOpen = false;
  showBackButton = false;
  workspaces: WorkspaceResponse[] = [];
  activeWorkspace: WorkspaceResponse | null = null;

  // Controle do Drag do Perfil (Bottom Sheet no Mobile)
  isDraggingProfile = false;
  profileTouchStartY = 0;
  profileTouchCurrentY = 0;

  constructor(
    private authService: AuthService,
    private workspaceService: WorkspaceService,
    private contexts: ChildrenOutletContexts,
    private router: Router,
    private location: Location
  ) {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      const url = this.router.url;
      this.showBackButton = (
        url.startsWith('/properties/') || 
        url.startsWith('/roteiros/builder') || 
        url.startsWith('/evaluate/')
      );
    });
  }

  ngOnInit(): void {
    if (this.isLoggedIn()) {
      this.loadWorkspaces();
    }
  }

  loadWorkspaces(): void {
    this.workspaceService.getWorkspaces().subscribe({
      next: (list) => {
        this.workspaces = list;
        this.activeWorkspace = list.find(w => w.active) || list[0] || null;
      },
      error: (err) => {
        console.error('Erro ao carregar workspaces', err);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    // Se o clique for fora do seletor do workspace e o menu estiver aberto, fecha o menu
    const workspaceContainer = document.querySelector('.workspace-selector-container');
    if (workspaceContainer && !workspaceContainer.contains(target)) {
      this.isWorkspaceMenuOpen = false;
    }
    // Se o clique for fora do perfil e o menu estiver aberto, fecha o menu
    const profileContainer = document.querySelector('.user-profile-menu-container');
    if (profileContainer && !profileContainer.contains(target)) {
      this.isProfileMenuOpen = false;
    }
  }

  toggleWorkspaceMenu(event: Event): void {
    event.stopPropagation();
    this.isWorkspaceMenuOpen = !this.isWorkspaceMenuOpen;
    if (this.isWorkspaceMenuOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  closeWorkspaceMenu(): void {
    this.isWorkspaceMenuOpen = false;
  }

  selectWorkspace(ws: WorkspaceResponse): void {
    if (ws.active) return;
    this.workspaceService.changeActiveWorkspace(ws.workspaceId).subscribe({
      next: () => {
        window.location.reload();
      },
      error: (err) => {
        alert('Erro ao alterar ambiente: ' + (err.error?.error || err.message));
      }
    });
  }

  createWorkspace(): void {
    const name = prompt('Digite o nome do novo ambiente:');
    if (!name || !name.trim()) return;

    this.workspaceService.createWorkspace({ name: name.trim() }).subscribe({
      next: (newWs) => {
        alert(`Ambiente "${newWs.workspaceName}" criado com sucesso!`);
        window.location.reload();
      },
      error: (err) => {
        alert('Erro ao criar ambiente: ' + (err.error?.error || err.message));
      }
    });
  }

  inviteUser(): void {
    const email = prompt('Digite o e-mail do usuário que deseja convidar para este ambiente:');
    if (!email || !email.trim()) return;

    this.workspaceService.inviteUser(email.trim()).subscribe({
      next: (res) => {
        alert(res.message || 'Usuário convidado com sucesso!');
      },
      error: (err) => {
        alert('Erro ao enviar convite: ' + (err.error?.error || err.message));
      }
    });
  }

  goBack(): void {
    const url = this.router.url;
    if (url.startsWith('/properties/create') || url.match(/^\/properties\/[^\/]+$/)) {
      this.router.navigate(['/properties']);
    } else if (url.startsWith('/roteiros/builder')) {
      this.router.navigate(['/roteiros']);
    } else if (url.startsWith('/evaluate/')) {
      const parts = url.split('/');
      const propertyId = parts[2];
      this.router.navigate(['/properties', propertyId]);
    } else {
      this.location.back();
    }
  }

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    if (this.isProfileMenuOpen) {
      this.isWorkspaceMenuOpen = false;
    }
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get userEmail(): string | null {
    return this.authService.getUserEmail();
  }

  get userInitials(): string {
    const email = this.userEmail || 'US';
    return email.substring(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    window.location.reload();
  }

  onProfileTouchStart(event: TouchEvent): void {
    const element = event.currentTarget as HTMLElement;
    if (element.scrollTop <= 0) {
      this.profileTouchStartY = event.touches[0].clientY;
      this.profileTouchCurrentY = event.touches[0].clientY;
      this.isDraggingProfile = true;
      element.style.transition = 'none';
    } else {
      this.isDraggingProfile = false;
    }
  }

  onProfileTouchMove(event: TouchEvent): void {
    if (!this.isDraggingProfile) return;
    const element = event.currentTarget as HTMLElement;
    this.profileTouchCurrentY = event.touches[0].clientY;
    const deltaY = this.profileTouchCurrentY - this.profileTouchStartY;

    if (deltaY > 0) {
      element.style.transform = `translateY(${deltaY}px)`;
      if (event.cancelable) {
        event.preventDefault();
      }
    } else {
      element.style.transform = '';
      element.style.transition = '';
      this.isDraggingProfile = false;
    }
  }

  onProfileTouchEnd(event: TouchEvent): void {
    if (!this.isDraggingProfile) return;
    const element = event.currentTarget as HTMLElement;
    element.style.transition = '';
    element.style.transform = '';
    this.isDraggingProfile = false;

    const deltaY = this.profileTouchCurrentY - this.profileTouchStartY;
    if (deltaY > 120) {
      this.isProfileMenuOpen = false;
    }
  }
}
