import { Component, OnInit, HostListener, DoCheck, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { EvaluationService } from '../../services/evaluation.service';
import { ScriptService } from '../../services/script.service';
import { PropertyResponse, EvaluationResponse, ScriptResponse } from '../../types';
import { LucideAngularModule } from 'lucide-angular';
import { modalTrigger, listStaggerTrigger } from '../../animations/animations';

@Component({
  selector: 'app-property-details',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './property-details.component.html',
  styleUrls: ['./property-details.component.css'],
  animations: [modalTrigger, listStaggerTrigger]
})
export class PropertyDetailsComponent implements OnInit, DoCheck, OnDestroy {
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
  isConfirmDeletePropOpen: boolean = false;

  // Controle do Lightbox de Mídias
  isLightboxOpen: boolean = false;
  activeMediaIndex: number = 0;
  zoomLevel: number = 1;
  panX: number = 0;
  panY: number = 0;
  isDraggingMedia: boolean = false;
  startX: number = 0;
  startY: number = 0;
  isFullscreen: boolean = false;
  initialTouchDistance: number = 0;
  initialZoom: number = 1;
  touchStartX: number = 0;
  touchEndX: number = 0;
  touchStartY: number = 0;
  touchEndY: number = 0;
  lastWheelTime: number = 0;

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
    this.evaluationScores = {};
    this.evaluations.forEach(ev => {
      this.scriptService.getScript(ev.scriptId, ev.scriptVersion).subscribe({
        next: (script) => {
          const score = this.evaluationService.calculateScore(script, ev.answers);
          this.evaluationScores = {
            ...this.evaluationScores,
            [`${ev.propertyId}_${ev.createdAt}`]: score
          };
        },
        error: () => {
          this.evaluationScores = {
            ...this.evaluationScores,
            [`${ev.propertyId}_${ev.createdAt}`]: 0
          };
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

  isCriteriaPenalty(scriptId: string, scriptVersion: number, criteriaId: string): boolean {
    const script = this.scripts.find(s => s.id === scriptId && s.version === scriptVersion);
    if (script) {
      const criteria = script.criteria.find(c => c.id === criteriaId);
      if (criteria) {
        return criteria.isScorable && criteria.weight < 0;
      }
    }
    return false;
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

  deleteProperty(): void {
    this.isConfirmDeletePropOpen = true;
  }

  confirmDeleteProperty(): void {
    if (!this.propertyId) return;
    this.propertyService.deleteProperty(this.propertyId).subscribe({
      next: () => {
        this.isConfirmDeletePropOpen = false;
        this.router.navigate(['/properties']);
      },
      error: () => {
        this.errorMessage = 'Erro ao excluir o imóvel.';
        this.isConfirmDeletePropOpen = false;
      }
    });
  }

  cancelDeleteProperty(): void {
    this.isConfirmDeletePropOpen = false;
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
    this.resetZoom();
    this.activeMediaIndex = index;
    this.isLightboxOpen = true;
  }

  closeLightbox(): void {
    if (this.isFullscreen) {
      document.exitFullscreen().catch(() => {});
      this.isFullscreen = false;
    }
    this.isLightboxOpen = false;
    this.resetZoom();
  }

  nextMedia(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.resetZoom();
    if (this.selectedEvaluation && this.selectedEvaluation.mediaUrls) {
      this.activeMediaIndex = (this.activeMediaIndex + 1) % this.selectedEvaluation.mediaUrls.length;
    }
  }

  prevMedia(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.resetZoom();
    if (this.selectedEvaluation && this.selectedEvaluation.mediaUrls) {
      const len = this.selectedEvaluation.mediaUrls.length;
      this.activeMediaIndex = (this.activeMediaIndex - 1 + len) % len;
    }
  }

  resetZoom(): void {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDraggingMedia = false;
  }

  toggleFullscreen(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const element = document.getElementById('lightbox-modal');
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().then(() => {
        this.isFullscreen = true;
      }).catch(err => {
        console.error(`Erro ao ativar tela cheia: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
      this.isFullscreen = false;
    }
  }

  @HostListener('document:fullscreenchange', [])
  onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
  }

  // Zoom via Scroll do Mouse (e mudanca de midia)
  onWheelZoom(event: WheelEvent): void {
    event.preventDefault();
    if (this.zoomLevel > 1) {
      const zoomSpeed = 0.1;
      const delta = event.deltaY < 0 ? 1 : -1;
      this.zoomLevel = Math.min(Math.max(this.zoomLevel + delta * zoomSpeed, 1), 4);
      
      // Se voltar para zoom 1, reseta posições do pan
      if (this.zoomLevel === 1) {
        this.panX = 0;
        this.panY = 0;
      }
    } else {
      const now = Date.now();
      // Debounce de 400ms para mudancas de midia via scroll para nao passar multiplas de uma vez
      if (now - this.lastWheelTime > 400) {
        this.lastWheelTime = now;
        if (event.deltaY > 0) {
          this.nextMedia();
        } else if (event.deltaY < 0) {
          this.prevMedia();
        }
      }
    }
  }

  // Arrastar Imagem (Desktop)
  startDrag(event: MouseEvent): void {
    if (this.zoomLevel <= 1) return;
    event.preventDefault();
    this.isDraggingMedia = true;
    this.startX = event.clientX - this.panX;
    this.startY = event.clientY - this.panY;
  }

  onDrag(event: MouseEvent): void {
    if (!this.isDraggingMedia) return;
    event.preventDefault();
    this.panX = event.clientX - this.startX;
    this.panY = event.clientY - this.startY;
  }

  endDrag(): void {
    this.isDraggingMedia = false;
  }

  // Zoom, Pan e Gesto de Deslizar/Swipe por Toque (Mobile)
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
      this.touchEndX = event.touches[0].clientX;
      this.touchEndY = event.touches[0].clientY;
      if (this.zoomLevel > 1) {
        this.isDraggingMedia = true;
        this.startX = event.touches[0].clientX - this.panX;
        this.startY = event.touches[0].clientY - this.panY;
      }
    } else if (event.touches.length === 2) {
      this.isDraggingMedia = false;
      this.initialTouchDistance = this.getTouchDistance(event.touches);
      this.initialZoom = this.zoomLevel;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1) {
      if (this.zoomLevel > 1 && this.isDraggingMedia) {
        this.panX = event.touches[0].clientX - this.startX;
        this.panY = event.touches[0].clientY - this.startY;
      } else if (this.zoomLevel === 1) {
        this.touchEndX = event.touches[0].clientX;
        this.touchEndY = event.touches[0].clientY;
      }
    } else if (event.touches.length === 2) {
      const distance = this.getTouchDistance(event.touches);
      if (this.initialTouchDistance > 0) {
        const factor = distance / this.initialTouchDistance;
        this.zoomLevel = Math.min(Math.max(this.initialZoom * factor, 1), 4);
        if (this.zoomLevel === 1) {
          this.panX = 0;
          this.panY = 0;
        }
      }
    }
  }

  onTouchEnd(): void {
    this.isDraggingMedia = false;
    this.initialTouchDistance = 0;

    if (this.zoomLevel === 1 && this.touchStartX !== 0) {
      const deltaX = this.touchEndX - this.touchStartX;
      const deltaY = this.touchEndY - this.touchStartY;
      
      // Verifica se o swipe foi predominantemente horizontal
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        const swipeThreshold = 50; // pixels minimos para reconhecer swipe
        if (deltaX < -swipeThreshold) {
          this.nextMedia();
        } else if (deltaX > swipeThreshold) {
          this.prevMedia();
        }
      }
    }
    
    // Reseta coordenadas do toque
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.touchStartY = 0;
    this.touchEndY = 0;
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
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

  ngDoCheck(): void {
    const active = this.isModalOpen || this.isConfirmDeleteOpen || this.isConfirmDeletePropOpen || this.isLightboxOpen;
    if (active) {
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
