import { Component, OnInit, DoCheck, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ScriptService } from '../../services/script.service';
import { ScriptResponse } from '../../types';
import { LucideAngularModule } from 'lucide-angular';
import { modalTrigger, listStaggerTrigger } from '../../animations/animations';

@Component({
  selector: 'app-scripts',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './scripts.component.html',
  styleUrls: ['./scripts.component.css'],
  animations: [modalTrigger, listStaggerTrigger]
})
export class ScriptsComponent implements OnInit, DoCheck, OnDestroy {
  scripts: ScriptResponse[] = [];
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  isConfirmDeleteOpen: boolean = false;
  scriptToDeleteId: string | null = null;

  constructor(
    private scriptService: ScriptService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadScripts();
  }

  loadScripts(): void {
    this.loading = true;
    this.scriptService.getActiveScripts().subscribe({
      next: (res) => {
        this.scripts = res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar roteiros.';
        this.loading = false;
      }
    });
  }

  editScript(id: string): void {
    this.router.navigate(['/roteiros/builder', id]);
  }

  createNewScript(): void {
    this.router.navigate(['/roteiros/builder']);
  }

  requestDeleteScript(event: Event, id: string): void {
    event.stopPropagation();
    this.scriptToDeleteId = id;
    this.isConfirmDeleteOpen = true;
  }

  cancelDelete(): void {
    this.isConfirmDeleteOpen = false;
    this.scriptToDeleteId = null;
  }

  confirmDelete(): void {
    if (!this.scriptToDeleteId) return;
    const idToDelete = this.scriptToDeleteId;
    this.cancelDelete();
    this.scriptService.deleteScript(idToDelete).subscribe({
      next: () => {
        this.scripts = this.scripts.filter(s => s.id !== idToDelete);
        this.successMessage = 'Roteiro excluído com sucesso.';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => {
        this.errorMessage = 'Erro ao excluir o roteiro. Tente novamente.';
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  ngDoCheck(): void {
    if (this.isConfirmDeleteOpen) {
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
