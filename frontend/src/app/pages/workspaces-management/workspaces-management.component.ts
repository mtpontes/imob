import { Component, OnInit, DoCheck, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../../services/workspace.service';
import { WorkspaceResponse } from '../../types';
import { LucideAngularModule } from 'lucide-angular';
import { modalTrigger, listStaggerTrigger } from '../../animations/animations';

@Component({
  selector: 'app-workspaces-management',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, FormsModule],
  templateUrl: './workspaces-management.component.html',
  styleUrls: ['./workspaces-management.component.css'],
  animations: [modalTrigger, listStaggerTrigger]
})
export class WorkspacesManagementComponent implements OnInit, DoCheck, OnDestroy {
  workspaces: WorkspaceResponse[] = [];
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Controles de Modais
  isModalOpen: boolean = false;
  isConfirmDeleteOpen: boolean = false;
  modalTitle: string = 'Criar Ambiente';
  workspaceNameInput: string = '';
  selectedWorkspace: WorkspaceResponse | null = null;
  workspaceToDelete: WorkspaceResponse | null = null;

  constructor(
    private workspaceService: WorkspaceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.loading = true;
    this.workspaceService.getWorkspaces().subscribe({
      next: (list) => {
        this.workspaces = list;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Erro ao carregar os ambientes.';
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.modalTitle = 'Criar Ambiente';
    this.workspaceNameInput = '';
    this.selectedWorkspace = null;
    this.isModalOpen = true;
  }

  openEditModal(event: Event, ws: WorkspaceResponse): void {
    event.stopPropagation();
    this.modalTitle = 'Editar Nome do Ambiente';
    this.workspaceNameInput = ws.workspaceName;
    this.selectedWorkspace = ws;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.workspaceNameInput = '';
    this.selectedWorkspace = null;
  }

  saveWorkspace(): void {
    const name = this.workspaceNameInput.trim();
    if (!name) return;

    if (this.selectedWorkspace) {
      // Editar
      const wsId = this.selectedWorkspace.workspaceId;
      const isActive = this.selectedWorkspace.active;
      this.workspaceService.updateWorkspace(wsId, name).subscribe({
        next: () => {
          this.closeModal();
          this.successMessage = 'Ambiente atualizado com sucesso.';
          setTimeout(() => this.successMessage = '', 3000);
          
          if (isActive) {
            // Se for o ativo, recarrega a página para atualizar o header
            localStorage.setItem('pending_toast_message', `Ambiente renomeado para "${name}" com sucesso!`);
            localStorage.setItem('pending_toast_type', 'success');
            window.location.reload();
          } else {
            this.loadWorkspaces();
          }
        },
        error: (err) => {
          this.errorMessage = 'Erro ao atualizar o ambiente: ' + (err.error?.error || err.message);
          setTimeout(() => this.errorMessage = '', 4000);
        }
      });
    } else {
      // Criar
      this.workspaceService.createWorkspace({ name }).subscribe({
        next: (newWs) => {
          this.closeModal();
          localStorage.setItem('pending_toast_message', `Ambiente "${newWs.workspaceName}" criado com sucesso!`);
          localStorage.setItem('pending_toast_type', 'success');
          // Ao criar, o backend o define como ativo automaticamente, então recarregamos a página
          window.location.reload();
        },
        error: (err) => {
          this.errorMessage = 'Erro ao criar o ambiente: ' + (err.error?.error || err.message);
          setTimeout(() => this.errorMessage = '', 4000);
        }
      });
    }
  }

  requestDeleteWorkspace(event: Event, ws: WorkspaceResponse): void {
    event.stopPropagation();
    this.workspaceToDelete = ws;
    this.isConfirmDeleteOpen = true;
  }

  cancelDelete(): void {
    this.isConfirmDeleteOpen = false;
    this.workspaceToDelete = null;
  }

  confirmDelete(): void {
    if (!this.workspaceToDelete) return;
    
    const ws = this.workspaceToDelete;
    this.isConfirmDeleteOpen = false;
    this.workspaceToDelete = null;

    this.workspaceService.deleteWorkspace(ws.workspaceId).subscribe({
      next: () => {
        this.successMessage = `Ambiente "${ws.workspaceName}" excluído com sucesso.`;
        setTimeout(() => this.successMessage = '', 3000);

        if (ws.active) {
          localStorage.setItem('pending_toast_message', `Ambiente "${ws.workspaceName}" excluído. Um novo ambiente ativo foi selecionado.`);
          localStorage.setItem('pending_toast_type', 'success');
          window.location.reload();
        } else {
          this.loadWorkspaces();
        }
      },
      error: (err) => {
        this.errorMessage = 'Erro ao excluir o ambiente: ' + (err.error?.error || err.message);
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/properties']);
  }

  ngDoCheck(): void {
    if (this.isModalOpen || this.isConfirmDeleteOpen) {
      document.documentElement.classList.add('no-scroll');
      document.body.classList.add('no-scroll');
    } else {
      document.documentElement.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    }
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
  }
}
