import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ScriptService } from '../../services/script.service';
import { ScriptResponse, Criteria } from '../../types';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-script-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './script-builder.component.html',
  styleUrls: ['./script-builder.component.css']
})
export class ScriptBuilderComponent implements OnInit {
  scriptForm: FormGroup;
  selectedScript: ScriptResponse | null = null;
  isEditMode: boolean = false;
  loading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  // Painel de Adicionar Criterio
  newCritLabel: string = '';
  newCritType: 'text' | 'bool' | 'range' = 'bool';
  newCritIsScorable: boolean = true;
  newCritWeight: number = 1;

  constructor(
    private fb: FormBuilder,
    private scriptService: ScriptService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.scriptForm = this.fb.group({
      name: ['', Validators.required],
      newVersion: [false],
      criteria: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      const version = params['version'];
      if (id && version) {
        this.isEditMode = true;
        this.loadScriptForEdit(id, Number(version));
      } else {
        this.resetForm();
      }
    });
  }

  loadScriptForEdit(id: string, version: number): void {
    this.loading = true;
    this.scriptService.getActiveScripts().subscribe({
      next: (res) => {
        const found = res.find(s => s.id === id && s.version === version);
        if (found) {
          this.selectedScript = found;
          this.scriptForm.patchValue({
            name: found.name || '',
            newVersion: false
          });
          
          this.criteria.clear();
          if (found.criteria) {
            found.criteria.forEach(c => this.addCriteria(c));
          }
        } else {
          this.errorMessage = 'Roteiro nao encontrado ou inativo.';
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar roteiros.';
        this.loading = false;
      }
    });
  }

  get criteria(): FormArray {
    return this.scriptForm.get('criteria') as FormArray;
  }

  addCriteria(crit?: Criteria): void {
    const critGroup = this.fb.group({
      id: [crit?.id || 'crit_' + Math.random().toString(36).substr(2, 9), Validators.required],
      label: [crit?.label || '', Validators.required],
      type: [crit?.type || 'bool', Validators.required],
      isScorable: [crit?.isScorable ?? true],
      weight: [crit?.weight ?? 1, [Validators.required, Validators.min(0)]],
      min: [crit?.min ?? 1],
      max: [crit?.max ?? 10]
    });

    this.criteria.push(critGroup);
  }

  removeCriteria(index: number): void {
    this.criteria.removeAt(index);
  }

  addCriteriaLocal(): void {
    if (!this.newCritLabel.trim()) {
      return;
    }

    const newCrit: Criteria = {
      id: 'crit_' + Math.random().toString(36).substr(2, 9),
      label: this.newCritLabel.trim(),
      type: this.newCritType,
      isScorable: this.newCritType === 'text' ? false : this.newCritIsScorable,
      weight: this.newCritType === 'text' ? 0 : this.newCritWeight,
      min: this.newCritType === 'range' ? 1 : undefined,
      max: this.newCritType === 'range' ? 10 : undefined
    };

    this.addCriteria(newCrit);

    // Limpa painel
    this.newCritLabel = '';
    this.newCritType = 'bool';
    this.newCritIsScorable = true;
    this.newCritWeight = 1;
  }

  onTypeChange(): void {
    if (this.newCritType === 'text') {
      this.newCritIsScorable = false;
      this.newCritWeight = 0;
    } else {
      this.newCritIsScorable = true;
      this.newCritWeight = 1;
    }
  }

  resetForm(): void {
    this.selectedScript = null;
    this.isEditMode = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.criteria.clear();
    this.scriptForm.reset({
      name: '',
      newVersion: false
    });
  }

  onSubmit(): void {
    if (this.scriptForm.invalid || this.criteria.length === 0) {
      this.errorMessage = 'Preencha todos os campos obrigatorios corretamente.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.scriptForm.value;

    if (this.isEditMode && this.selectedScript) {
      this.scriptService.updateScript(this.selectedScript.id, {
        name: payload.name,
        newVersion: payload.newVersion,
        criteria: payload.criteria
      }).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/roteiros']);
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Erro ao atualizar roteiro.';
        }
      });
    } else {
      this.scriptService.createScript({
        name: payload.name,
        criteria: payload.criteria
      }).subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/roteiros']);
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Erro ao criar roteiro.';
        }
      });
    }
  }
}
