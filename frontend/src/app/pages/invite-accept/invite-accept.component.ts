import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceService } from '../../services/workspace.service';
import { InviteDetailsResponse } from '../../types';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-invite-accept',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './invite-accept.component.html',
  styleUrls: ['./invite-accept.component.css']
})
export class InviteAcceptComponent implements OnInit {
  token: string = '';
  invite: InviteDetailsResponse | null = null;
  loading: boolean = true;
  accepting: boolean = false;
  error: string = '';
  success: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workspaceService: WorkspaceService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.loadInviteDetails();
  }

  private loadInviteDetails(): void {
    this.workspaceService.getInviteDetails(this.token).subscribe({
      next: (details) => {
        this.invite = details;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 410) {
          this.error = 'Este convite expirou e não pode mais ser utilizado.';
        } else if (err.status === 404) {
          this.error = 'Convite não encontrado ou já utilizado.';
        } else {
          this.error = 'Ocorreu um erro ao carregar os detalhes do convite.';
        }
      }
    });
  }

  acceptInvite(): void {
    this.accepting = true;
    this.workspaceService.acceptInvite(this.token).subscribe({
      next: () => {
        this.success = true;
        this.accepting = false;
        setTimeout(() => this.router.navigate(['/properties']), 1500);
      },
      error: (err) => {
        this.accepting = false;
        if (err.status === 409) {
          this.error = 'Você já é membro deste ambiente.';
        } else if (err.status === 410) {
          this.error = 'Este convite expirou.';
        } else if (err.status === 404) {
          this.error = 'Convite não encontrado ou já utilizado.';
        } else {
          this.error = 'Ocorreu um erro ao aceitar o convite. Tente novamente.';
        }
      }
    });
  }

  goToProperties(): void {
    this.router.navigate(['/properties']);
  }

  getRoleLabel(role: string): string {
    if (role === 'ADMIN') return 'Administrador';
    if (role === 'MEMBER') return 'Membro';
    return role;
  }

  getExpiresAtLabel(): string {
    if (!this.invite) return '';
    const date = new Date(this.invite.expiresAt * 1000);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
