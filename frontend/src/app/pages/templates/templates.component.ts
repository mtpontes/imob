import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TemplateService } from '../../services/template.service';
import { TemplateResponse } from '../../types';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './templates.component.html',
  styleUrls: ['./templates.component.css']
})
export class TemplatesComponent implements OnInit {
  templates: TemplateResponse[] = [];
  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private templateService: TemplateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading = true;
    this.templateService.getActiveTemplates().subscribe({
      next: (res) => {
        this.templates = res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar templates.';
        this.loading = false;
      }
    });
  }

  toggleTemplateStatus(tpl: TemplateResponse, event: Event): void {
    event.stopPropagation();
    
    // Inverte o status local
    const newStatus = !tpl.isActive;
    
    // Como a especificação Quarkus do backend nos permite inativar atualizando o status, 
    // ou se o endpoint no backend estiver implementado para alternar, chamamos.
    // Vamos ver a SPEC: "Templates (/api/templates): PUT /{id}: Edita um template..."
    // E no frontend atual, como é implementado o toggleTemplateActive?
    // Vamos dar uma olhada se no TemplateService tem algum método ou se chamamos updateTemplate.
    // No frontend atual: não temos toggleTemplateActive implementado no TemplateService?
    // Vamos fazer um grep para 'toggle' ou 'update' no template.service.ts para saber o que temos disponível no Service!
  }

  editTemplate(id: string, version: number): void {
    this.router.navigate(['/templates/builder', id, version]);
  }

  createNewTemplate(): void {
    this.router.navigate(['/templates/builder']);
  }
}
