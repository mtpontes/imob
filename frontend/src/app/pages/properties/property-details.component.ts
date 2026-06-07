import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { EvaluationService } from '../../services/evaluation.service';
import { TemplateService } from '../../services/template.service';
import { PropertyResponse, EvaluationResponse, TemplateResponse } from '../../types';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-property-details',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './property-details.component.html',
  styleUrls: ['./property-details.component.css']
})
export class PropertyDetailsComponent implements OnInit {
  propertyId: string = '';
  property?: PropertyResponse;
  evaluations: EvaluationResponse[] = [];
  templates: TemplateResponse[] = [];
  loading: boolean = false;
  errorMessage: string = '';

  // Controle do Modal
  isModalOpen: boolean = false;
  selectedEvaluation: EvaluationResponse | null = null;
  selectedTemplateName: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService,
    private evaluationService: EvaluationService,
    private templateService: TemplateService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.propertyId = params['propertyId'];
      if (this.propertyId) {
        this.loadProperty();
        this.loadEvaluations();
        this.loadTemplates();
      }
    });
  }

  loadProperty(): void {
    this.loading = true;
    this.propertyService.getProperties().subscribe({
      next: (res) => {
        this.property = res.find(p => p.id === this.propertyId);
        if (!this.property) {
          this.errorMessage = 'Imovel nao encontrado.';
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar dados do imovel.';
        this.loading = false;
      }
    });
  }

  loadEvaluations(): void {
    this.evaluationService.getEvaluationsByProperty(this.propertyId).subscribe({
      next: (res) => {
        this.evaluations = res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar historico de avaliacoes.';
      }
    });
  }

  loadTemplates(): void {
    this.templateService.getActiveTemplates().subscribe({
      next: (res) => {
        this.templates = res;
      },
      error: () => {}
    });
  }

  getCriteriaLabel(templateId: string, templateVersion: number, criteriaId: string): string {
    const template = this.templates.find(t => t.id === templateId && t.version === templateVersion);
    if (template) {
      const criteria = template.criteria.find(c => c.id === criteriaId);
      if (criteria) {
        return criteria.label;
      }
    }
    return criteriaId;
  }

  getCriteriaType(templateId: string, templateVersion: number, criteriaId: string): string {
    const template = this.templates.find(t => t.id === templateId && t.version === templateVersion);
    if (template) {
      const criteria = template.criteria.find(c => c.id === criteriaId);
      if (criteria) {
        return criteria.type;
      }
    }
    return 'text';
  }

  openEvaluationDetails(ev: EvaluationResponse): void {
    this.selectedEvaluation = ev;
    this.isModalOpen = true;

    // Busca o nome do template no backend se existir
    const tpl = this.templates.find(t => t.id === ev.templateId && t.version === ev.templateVersion);
    this.selectedTemplateName = tpl && tpl.name ? tpl.name : `Protocolo #${ev.templateId.substring(0, 5)}`;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedEvaluation = null;
    this.selectedTemplateName = '';
  }

  startNewEvaluation(): void {
    this.router.navigate(['/evaluate', this.propertyId]);
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
