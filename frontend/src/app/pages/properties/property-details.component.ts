import { Component, OnInit, HostListener } from '@angular/core';
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
  evaluationScores: { [key: string]: number | undefined } = {};
  
  // Controle do Modal de Exclusão Customizado
  isConfirmDeleteOpen: boolean = false;
  evaluationToDelete: EvaluationResponse | null = null;

  // Controle do Lightbox de Mídias
  isLightboxOpen: boolean = false;
  activeMediaIndex: number = 0;

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
        this.calculateEvaluationsScores();
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar histórico de avaliações.';
      }
    });
  }

  calculateEvaluationsScores(): void {
    this.evaluations.forEach(ev => {
      this.scriptService.getScript(ev.scriptId, ev.scriptVersion).subscribe({
        next: (script) => {
          this.evaluationScores[`${ev.propertyId}_${ev.createdAt}`] = this.evaluationService.calculateScore(script, ev.answers);
        },
        error: () => {
          this.evaluationScores[`${ev.propertyId}_${ev.createdAt}`] = 0;
        }
      });
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

  getScriptName(scriptId: string, scriptVersion: number): string {
    const scr = this.scripts.find(s => s.id === scriptId && s.version === scriptVersion);
    return scr && scr.name ? scr.name : `Roteiro #${scriptId.substring(0, 5)}`;
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

  editEvaluation(ev: EvaluationResponse): void {
    this.closeModal();
    this.router.navigate(['/evaluate', this.propertyId, 'edit', ev.createdAt]);
  }

  deleteEvaluation(ev: EvaluationResponse): void {
    this.evaluationToDelete = ev;
    this.isConfirmDeleteOpen = true;
  }

  confirmDelete(): void {
    if (!this.evaluationToDelete) return;
    this.evaluationService.deleteEvaluation(this.propertyId, this.evaluationToDelete.createdAt).subscribe({
      next: () => {
        this.closeModal();
        this.cancelDelete();
        this.loadEvaluations();
      },
      error: () => {
        this.errorMessage = 'Erro ao excluir a avaliação.';
        this.cancelDelete();
      }
    });
  }

  cancelDelete(): void {
    this.isConfirmDeleteOpen = false;
    this.evaluationToDelete = null;
  }

  startNewEvaluation(): void {
    this.router.navigate(['/evaluate', this.propertyId]);
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  isVideoButton(url: string): boolean {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.mp4') || 
           cleanUrl.endsWith('.webm') || 
           cleanUrl.endsWith('.ogg') || 
           cleanUrl.endsWith('.mov') || 
           cleanUrl.endsWith('.avi');
  }

  openLightbox(index: number): void {
    this.activeMediaIndex = index;
    this.isLightboxOpen = true;
  }

  closeLightbox(): void {
    this.isLightboxOpen = false;
  }

  nextMedia(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.selectedEvaluation && this.selectedEvaluation.mediaUrls) {
      this.activeMediaIndex = (this.activeMediaIndex + 1) % this.selectedEvaluation.mediaUrls.length;
    }
  }

  prevMedia(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.selectedEvaluation && this.selectedEvaluation.mediaUrls) {
      const len = this.selectedEvaluation.mediaUrls.length;
      this.activeMediaIndex = (this.activeMediaIndex - 1 + len) % len;
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.isLightboxOpen) {
      if (event.key === 'Escape') {
        this.closeLightbox();
      } else if (event.key === 'ArrowRight') {
        this.nextMedia();
      } else if (event.key === 'ArrowLeft') {
        this.prevMedia();
      }
    }
  }
}
