import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, RouterModule, ChildrenOutletContexts, Router, NavigationEnd } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { WorkspaceService } from './services/workspace.service';
import { WorkspaceResponse } from './types';
import { LucideAngularModule } from 'lucide-angular';
import { routeAnimations, dropdownTrigger, modalTrigger, slideUpMobile } from './animations/animations';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, LucideAngularModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  animations: [routeAnimations, dropdownTrigger, modalTrigger, slideUpMobile]
})
export class AppComponent implements OnInit {
  title = 'frontend';
  isProfileMenuOpen = false;
  isWorkspaceMenuOpen = false;
  showBackButton = false;
  workspaces: WorkspaceResponse[] = [];
  activeWorkspace: WorkspaceResponse | null = null;

  // Controle de Modais Customizados
  isCreateWorkspaceModalOpen = false;
  newWorkspaceName = '';
  isInviteUserModalOpen = false;
  inviteUserRole = 'MEMBER';
  generatedInviteUrl = '';
  isInviteLinkGenerated = false;
  isInviteRoute = false;

  // Toast de Notificação Customizado
  toast = {
    show: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'warning',
    icon: 'check-circle'
  };

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
    // Inicialização síncrona imediata para evitar race conditions na primeira renderização
    const path = window.location.pathname;
    this.isInviteRoute = path.startsWith('/invite/');
    this.showBackButton = (
      path.startsWith('/properties/') || 
      path.startsWith('/roteiros/builder/') || 
      path.startsWith('/evaluate/') ||
      path.startsWith('/environments')
    );

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => {
      const url = this.router.url;
      this.showBackButton = (
        url.startsWith('/properties/') || 
        url.startsWith('/roteiros/builder') || 
        url.startsWith('/evaluate/') ||
        url.startsWith('/environments')
      );
      this.isInviteRoute = url.startsWith('/invite/');
    });
  }

  ngOnInit(): void {
    // Processa o redirect do Cognito apos login social (hash com #id_token=...&access_token=...)
    this.authService.handleCognitoCallback(window.location.hash);

    if (this.isLoggedIn()) {
      this.loadWorkspaces();
    }

    // Verifica se há toast pendente após recarregamento de página
    const pendingToastMessage = localStorage.getItem('pending_toast_message');
    const pendingToastType = localStorage.getItem('pending_toast_type') as 'success' | 'error' | 'warning' | null;
    if (pendingToastMessage && pendingToastType) {
      this.showToast(pendingToastMessage, pendingToastType);
      localStorage.removeItem('pending_toast_message');
      localStorage.removeItem('pending_toast_type');
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
        this.showToast('Erro ao alterar ambiente: ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  createWorkspace(): void {
    this.isCreateWorkspaceModalOpen = true;
    this.newWorkspaceName = '';
    this.isProfileMenuOpen = false;
    this.isWorkspaceMenuOpen = false;
  }

  closeCreateWorkspaceModal(): void {
    this.isCreateWorkspaceModalOpen = false;
    this.newWorkspaceName = '';
  }

  submitCreateWorkspace(): void {
    const name = this.newWorkspaceName.trim();
    if (!name) return;

    this.workspaceService.createWorkspace({ name }).subscribe({
      next: (newWs) => {
        localStorage.setItem('pending_toast_message', `Ambiente "${newWs.workspaceName}" criado com sucesso!`);
        localStorage.setItem('pending_toast_type', 'success');
        this.closeCreateWorkspaceModal();
        window.location.reload();
      },
      error: (err) => {
        this.showToast('Erro ao criar ambiente: ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  inviteUser(): void {
    this.isInviteUserModalOpen = true;
    this.inviteUserRole = 'MEMBER';
    this.generatedInviteUrl = '';
    this.isInviteLinkGenerated = false;
    this.isProfileMenuOpen = false;
    this.isWorkspaceMenuOpen = false;
  }

  closeInviteUserModal(): void {
    this.isInviteUserModalOpen = false;
    this.generatedInviteUrl = '';
    this.isInviteLinkGenerated = false;
  }

  submitInviteUser(): void {
    this.workspaceService.createInvite(this.inviteUserRole).subscribe({
      next: (res) => {
        this.generatedInviteUrl = `${window.location.origin}/invite/${res.token}`;
        this.isInviteLinkGenerated = true;
        this.showToast('Link de convite gerado com sucesso!', 'success');
      },
      error: (err) => {
        this.showToast('Erro ao gerar link de convite: ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  copyInviteUrl(): void {
    if (!this.generatedInviteUrl) return;
    navigator.clipboard.writeText(this.generatedInviteUrl).then(() => {
      this.showToast('Link copiado para a área de transferência!', 'success');
    }).catch(err => {
      this.showToast('Erro ao copiar link.', 'error');
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'warning' = 'success', duration = 3000): void {
    let icon = 'check-circle';
    if (type === 'error') {
      icon = 'alert-triangle';
    } else if (type === 'warning') {
      icon = 'alert-circle';
    }

    this.toast = {
      show: true,
      message,
      type,
      icon
    };

    setTimeout(() => {
      this.toast.show = false;
    }, duration);
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
    } else if (url.startsWith('/environments')) {
      this.router.navigate(['/properties']);
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
      this.loadWorkspaces();
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
    element.style.transition = 'transform 0.15s ease-out';
    element.style.transform = '';
    this.isDraggingProfile = false;

    setTimeout(() => {
      element.style.transition = '';
    }, 150);

    const deltaY = this.profileTouchCurrentY - this.profileTouchStartY;
    if (deltaY > 120) {
      this.isProfileMenuOpen = false;
    }
  }
}
