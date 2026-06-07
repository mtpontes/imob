import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ScriptService } from '../../services/script.service';
import { ScriptResponse } from '../../types';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-scripts',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './scripts.component.html',
  styleUrls: ['./scripts.component.css']
})
export class ScriptsComponent implements OnInit {
  scripts: ScriptResponse[] = [];
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

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

  editScript(id: string, version: number): void {
    this.router.navigate(['/roteiros/builder', id, version]);
  }

  createNewScript(): void {
    this.router.navigate(['/roteiros/builder']);
  }
}
