import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { EvaluationService } from '../../services/evaluation.service';
import { ScriptService } from '../../services/script.service';
import { PropertyResponse, EvaluationResponse, ScriptResponse } from '../../types';
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
  scripts: ScriptResponse[] = [];
  loading: boolean = false;
  errorMessage: string = '';

  // Controle do Modal
  isModalOpen: boolean = false;
  selectedEvaluation: EvaluationResponse | null = null;
  selectedScriptName: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService,
    private evaluationService: EvaluationService,
    private scriptService: ScriptService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.propertyId = params['propertyId'];
      if (this.propertyId) {
        this.loadProperty();
        this.loadEvaluations();
        this.loadScripts();
      }
    });
  }

  loadProperty(): void {
    this.loading = true;
    this.propertyService.getProperties().subscribe({
      next: (res) => {
        this.property = res.find(p => p.id === this.propertyId);
        if (!this.property) {
          this.errorMessage = 'Imóvel não encontrado.';
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar dados do imóvel.';
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
        this.errorMessage = 'Erro ao carregar histórico de avaliações.';
      }
    });
  }

  loadScripts(): void {
    this.scriptService.getActiveScripts().subscribe({
      next: (res) => {
        this.scripts = res;
      },
      error: () => {}
    });
  }

  getCriteriaLabel(scriptId: string, scriptVersion: number, criteriaId: string): string {
    const script = this.scripts.find(s => s.id === scriptId && s.version === scriptVersion);
    if (script) {
      const criteria = script.criteria.find(c => c.id === criteriaId);
      if (criteria) {
        return criteria.label;
      }
    }
    return criteriaId;
  }

  getCriteriaType(scriptId: string, scriptVersion: number, criteriaId: string): string {
    const script = this.scripts.find(s => s.id === scriptId && s.version === scriptVersion);
    if (script) {
      const criteria = script.criteria.find(c => c.id === criteriaId);
      if (criteria) {
        return criteria.type;
      }
    }
    return 'text';
  }

  openEvaluationDetails(ev: EvaluationResponse): void {
    this.selectedEvaluation = ev;
    this.isModalOpen = true;

    // Busca o nome do roteiro no backend se existir
    const scr = this.scripts.find(s => s.id === ev.scriptId && s.version === ev.scriptVersion);
    this.selectedScriptName = scr && scr.name ? scr.name : `Roteiro #${ev.scriptId.substring(0, 5)}`;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedEvaluation = null;
    this.selectedScriptName = '';
  }

  startNewEvaluation(): void {
    this.router.navigate(['/evaluate', this.propertyId]);
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
