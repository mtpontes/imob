import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { ScriptService } from '../../services/script.service';
import { EvaluationService } from '../../services/evaluation.service';
import { PropertyResponse, ScriptResponse, Criteria } from '../../types';
import { LucideAngularModule } from 'lucide-angular';

interface UploadItem {
  name: string;
  progress: number;
  loading: boolean;
  success: boolean;
}

@Component({
  selector: 'app-evaluation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './evaluation-form.component.html',
  styleUrls: ['./evaluation-form.component.css']
})
export class EvaluationFormComponent implements OnInit {
  propertyId: string = '';
  property?: PropertyResponse;
  scripts: ScriptResponse[] = [];
  selectedScript?: ScriptResponse;

  evaluationForm?: FormGroup;
  currentScore: number = 0;
  uploadedMediaKeys: string[] = [];
  uploads: UploadItem[] = [];

  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService,
    private scriptService: ScriptService,
    private evaluationService: EvaluationService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.propertyId = params['propertyId'];
      if (this.propertyId) {
        this.loadProperty();
        this.loadScripts();
      }
    });
  }

  loadProperty(): void {
    this.propertyService.getProperties().subscribe({
      next: (res) => {
        this.property = res.find(p => p.id === this.propertyId);
        if (!this.property) {
          this.errorMessage = 'Imóvel não encontrado.';
        }
      },
      error: () => this.errorMessage = 'Erro ao carregar dados do imóvel.'
    });
  }

  loadScripts(): void {
    this.scriptService.getActiveScripts().subscribe({
      next: (res) => {
        this.scripts = res;
      },
      error: () => this.errorMessage = 'Erro ao carregar roteiros de avaliação.'
    });
  }

  get scoreBadgeText(): string {
    if (this.currentScore === 0 && !this.isAnyScorableAnswered()) return 'Aguardando';
    if (this.currentScore < 50) return 'Ruim';
    if (this.currentScore >= 50 && this.currentScore < 80) return 'Regular';
    return 'Excelente';
  }

  get scoreBadgeClass(): string {
    if (this.currentScore === 0 && !this.isAnyScorableAnswered()) return 'none';
    if (this.currentScore < 50) return 'low';
    if (this.currentScore >= 50 && this.currentScore < 80) return 'medium';
    return 'high';
  }

  isAnyScorableAnswered(): boolean {
    if (!this.selectedScript || !this.evaluationForm) return false;
    const answers = this.evaluationForm.value.answers;
    return this.selectedScript.criteria.some(criteria => {
      if (!criteria.isScorable) return false;
      const val = answers[criteria.id];
      return val !== null && val !== undefined && val !== '';
    });
  }

  getScorableCriteriaCount(): string {
    if (!this.selectedScript || !this.evaluationForm) return '0/0';
    const answers = this.evaluationForm.value.answers;
    const scorable = this.selectedScript.criteria.filter(c => c.isScorable);
    let answered = 0;
    scorable.forEach(c => {
      const val = answers[c.id];
      if (val !== null && val !== undefined && val !== '') {
        answered++;
      }
    });
    return `${answered}/${scorable.length}`;
  }

  onScriptChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const scriptId = target.value;
    
    this.selectedScript = this.scripts.find(s => s.id === scriptId);
    if (this.selectedScript) {
      this.buildForm(this.selectedScript);
    } else {
      this.evaluationForm = undefined;
      this.currentScore = 0;
    }
  }

  buildForm(script: ScriptResponse): void {
    const answersGroup: { [key: string]: any } = {};

    script.criteria.forEach((criteria: Criteria) => {
      if (criteria.type === 'bool') {
        answersGroup[criteria.id] = [false];
      } else if (criteria.type === 'range') {
        const minVal = criteria.min !== undefined ? criteria.min : 1;
        answersGroup[criteria.id] = [minVal, [Validators.required]];
      } else {
        answersGroup[criteria.id] = [''];
      }
    });

    this.evaluationForm = this.fb.group({
      answers: this.fb.group(answersGroup),
      notes: ['']
    });

    this.currentScore = 0;
    this.uploadedMediaKeys = [];
    this.uploads = [];

    // Inscreve no valueChanges para calcular score local em tempo real
    this.evaluationForm.valueChanges.subscribe(() => {
      this.calculateLocalScore();
    });
  }

  calculateLocalScore(): void {
    if (!this.selectedScript || !this.evaluationForm) {
      this.currentScore = 0;
      return;
    }

    const answers = this.evaluationForm.value.answers;
    let totalWeight = 0;
    let earnedPoints = 0;

    this.selectedScript.criteria.forEach((criteria: Criteria) => {
      if (!criteria.isScorable) {
        return;
      }

      const val = answers[criteria.id];
      if (val === null || val === undefined || val === '') {
        return;
      }

      const weight = criteria.weight;
      let points = 0;

      if (criteria.type === 'bool') {
        if (val === true || val === 'true') {
          points = weight;
        }
      } else if (criteria.type === 'range') {
        const numVal = Number(val);
        const min = criteria.min !== undefined ? criteria.min : 1;
        const max = criteria.max !== undefined ? criteria.max : 10;

        if (max > min) {
          if (numVal <= min) {
            points = 0;
          } else if (numVal >= max) {
            points = weight;
          } else {
            const proportion = (numVal - min) / (max - min);
            points = proportion * weight;
          }
        }
      }

      earnedPoints += points;
      totalWeight += weight;
    });

    if (totalWeight === 0) {
      this.currentScore = 0;
    } else {
      const score = (earnedPoints / totalWeight) * 100;
      this.currentScore = Math.round(score * 100) / 100;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      for (let i = 0; i < input.files.length; i++) {
        this.uploadFile(input.files[i]);
      }
    }
  }

  uploadFile(file: File): void {
    const uploadItem: UploadItem = {
      name: file.name,
      progress: 0,
      loading: true,
      success: false
    };
    this.uploads.push(uploadItem);

    this.evaluationService.generateUploadUrl(file.name).subscribe({
      next: (urlRes) => {
        uploadItem.progress = 30;
        this.evaluationService.uploadFileToS3(urlRes.uploadUrl, file).subscribe({
          next: () => {
            uploadItem.progress = 100;
            uploadItem.loading = false;
            uploadItem.success = true;
            this.uploadedMediaKeys.push(urlRes.s3Key);
          },
          error: () => {
            uploadItem.loading = false;
            uploadItem.success = false;
            this.errorMessage = 'Erro ao fazer upload da foto para o S3.';
          }
        });
      },
      error: () => {
        uploadItem.loading = false;
        uploadItem.success = false;
        this.errorMessage = 'Erro ao gerar URL de upload.';
      }
    });
  }

  onSubmit(): void {
    if (!this.selectedScript || !this.evaluationForm || this.evaluationForm.invalid) {
      this.errorMessage = 'Por favor, preencha o formulário corretamente.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const answersMap: { [key: string]: any } = {};
    const answers = this.evaluationForm.value.answers;
    
    this.selectedScript.criteria.forEach((criteria: Criteria) => {
      const val = answers[criteria.id];
      if (criteria.type === 'bool') {
        answersMap[criteria.id] = val === true || val === 'true';
      } else if (criteria.type === 'range') {
        answersMap[criteria.id] = Number(val);
      } else {
        answersMap[criteria.id] = val || '';
      }
    });

    const request = {
      propertyId: this.propertyId,
      scriptId: this.selectedScript.id,
      scriptVersion: this.selectedScript.version,
      answers: answersMap,
      notes: this.evaluationForm.value.notes || '',
      mediaKeys: this.uploadedMediaKeys
    };

    this.evaluationService.createEvaluation(request).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Avaliação salva com sucesso!';
        this.router.navigate(['/properties', this.propertyId]);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erro ao salvar avaliação.';
      }
    });
  }

  cancelEvaluation(): void {
    this.router.navigate(['/properties', this.propertyId]);
  }
}
