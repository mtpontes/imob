import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TemplateService } from '../../services/template.service';
import { TemplateResponse, Criteria } from '../../types';

@Component({
  selector: 'app-template-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './template-builder.component.html',
  styleUrls: ['./template-builder.component.css']
})
export class TemplateBuilderComponent implements OnInit {
  templates: TemplateResponse[] = [];
  selectedTemplate: TemplateResponse | null = null;
  templateForm: FormGroup;
  isEditMode: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private templateService: TemplateService
  ) {
    this.templateForm = this.fb.group({
      newVersion: [false],
      criteria: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.templateService.getActiveTemplates().subscribe({
      next: (res) => this.templates = res,
      error: () => this.errorMessage = 'Erro ao carregar templates.'
    });
  }

  get criteria(): FormArray {
    return this.templateForm.get('criteria') as FormArray;
  }

  addCriteria(crit?: Criteria): void {
    const critGroup = this.fb.group({
      id: [crit?.id || '', Validators.required],
      label: [crit?.label || '', Validators.required],
      type: [crit?.type || 'bool', Validators.required],
      isScorable: [crit?.isScorable ?? true],
      weight: [crit?.weight ?? 1.0, [Validators.required, Validators.min(0)]],
      min: [crit?.min ?? 0.0, Validators.min(0)],
      max: [crit?.max ?? 10.0, Validators.min(0)]
    });

    this.criteria.push(critGroup);
  }

  removeCriteria(index: number): void {
    this.criteria.removeAt(index);
  }

  selectTemplate(template: TemplateResponse): void {
    this.selectedTemplate = template;
    this.isEditMode = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Limpa criterios existentes
    this.criteria.clear();

    // Habilita campo newVersion no form
    this.templateForm.patchValue({ newVersion: false });

    // Preenche criterios do template selecionado
    if (template.criteria) {
      template.criteria.forEach(c => this.addCriteria(c));
    }
  }

  resetForm(): void {
    this.selectedTemplate = null;
    this.isEditMode = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.criteria.clear();
    this.templateForm.patchValue({ newVersion: false });
    this.addCriteria(); // Adiciona um criterio em branco inicial
  }

  onSubmit(): void {
    if (this.templateForm.invalid || this.criteria.length === 0) {
      this.errorMessage = 'Por favor, preencha todos os campos obrigatórios corretamente.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.templateForm.value;

    if (this.isEditMode && this.selectedTemplate) {
      this.templateService.updateTemplate(this.selectedTemplate.id, {
        newVersion: payload.newVersion,
        criteria: payload.criteria
      }).subscribe({
        next: (res) => {
          this.loading = false;
          this.successMessage = payload.newVersion 
            ? 'Nova versao do template salva com sucesso!' 
            : 'Template atualizado com sucesso!';
          this.loadTemplates();
          this.selectTemplate(res);
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Erro ao atualizar template.';
        }
      });
    } else {
      this.templateService.createTemplate({
        criteria: payload.criteria
      }).subscribe({
        next: (res) => {
          this.loading = false;
          this.successMessage = 'Template criado com sucesso!';
          this.loadTemplates();
          this.selectTemplate(res);
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Erro ao criar template.';
        }
      });
    }
  }
}
