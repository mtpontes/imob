import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { TemplateService } from '../../services/template.service';
import { EvaluationService } from '../../services/evaluation.service';
import { PropertyResponse, TemplateResponse, EvaluationResponse, Criteria } from '../../types';

interface UploadItem {
  name: string;
  progress: number;
  loading: boolean;
  success: boolean;
}

@Component({
  selector: 'app-evaluation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './evaluation-form.component.html',
  styleUrls: ['./evaluation-form.component.css']
})
export class EvaluationFormComponent implements OnInit {
  propertyId: string = '';
  property?: PropertyResponse;
  templates: TemplateResponse[] = [];
  selectedTemplate?: TemplateResponse;
  pastEvaluations: EvaluationResponse[] = [];

  evaluationForm?: FormGroup;
  currentScore: number = 0;
  uploadedMediaKeys: string[] = [];
  uploads: UploadItem[] = [];

  loading: boolean = false;
  loadingHistory: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService,
    private templateService: TemplateService,
    private evaluationService: EvaluationService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.propertyId = params['propertyId'];
      if (this.propertyId) {
        this.loadProperty();
        this.loadTemplates();
        this.loadPastEvaluations();
      }
    });
  }

  loadProperty(): void {
    this.propertyService.getProperties().subscribe({
      next: (res) => {
        this.property = res.find(p => p.id === this.propertyId);
        if (!this.property) {
          this.errorMessage = 'Imovel nao encontrado.';
        }
      },
      error: () => this.errorMessage = 'Erro ao carregar dados do imovel.'
    });
  }

  loadTemplates(): void {
    this.templateService.getActiveTemplates().subscribe({
      next: (res) => {
        this.templates = res;
      },
      error: () => this.errorMessage = 'Erro ao carregar templates de avaliacao.'
    });
  }

  loadPastEvaluations(): void {
    this.loadingHistory = true;
    this.evaluationService.getEvaluationsByProperty(this.propertyId).subscribe({
      next: (res) => {
        this.pastEvaluations = res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.loadingHistory = false;
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar historico de avaliacoes.';
        this.loadingHistory = false;
      }
    });
  }

  onTemplateChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const templateId = target.value;
    
    this.selectedTemplate = this.templates.find(t => t.id === templateId);
    if (this.selectedTemplate) {
      this.buildForm(this.selectedTemplate);
    } else {
      this.evaluationForm = undefined;
      this.currentScore = 0;
    }
  }

  buildForm(template: TemplateResponse): void {
    const answersGroup: { [key: string]: any } = {};

    template.criteria.forEach((criteria: Criteria) => {
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
    if (!this.selectedTemplate || !this.evaluationForm) {
      this.currentScore = 0;
      return;
    }

    const answers = this.evaluationForm.value.answers;
    let totalWeight = 0;
    let earnedPoints = 0;

    this.selectedTemplate.criteria.forEach((criteria: Criteria) => {
      if (!criteria.isScorable) {
        return;
      }

      const val = answers[criteria.id];
      if (val === null || val === undefined) {
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
        const min = criteria.min !== undefined ? criteria.min : 0;
        const max = criteria.max !== undefined ? criteria.max : 100;

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
      const file = input.files[0];
      this.uploadFile(file);
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
    if (!this.selectedTemplate || !this.evaluationForm || this.evaluationForm.invalid) {
      this.errorMessage = 'Por favor, preencha o formulario corretamente.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const answersMap: { [key: string]: any } = {};
    const answers = this.evaluationForm.value.answers;
    
    // Converte os valores para os tipos esperados do backend Quarkus
    this.selectedTemplate.criteria.forEach((criteria: Criteria) => {
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
      templateId: this.selectedTemplate.id,
      templateVersion: this.selectedTemplate.version,
      answers: answersMap,
      notes: this.evaluationForm.value.notes || '',
      mediaKeys: this.uploadedMediaKeys
    };

    this.evaluationService.createEvaluation(request).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Avaliacao salva com sucesso!';
        this.evaluationForm = undefined;
        this.selectedTemplate = undefined;
        this.uploadedMediaKeys = [];
        this.uploads = [];
        this.loadPastEvaluations();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erro ao salvar avaliacao.';
      }
    });
  }
}
