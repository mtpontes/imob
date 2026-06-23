import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ScriptService } from '../../services/script.service';
import { ScriptResponse, Criteria } from '../../types';
import { LucideAngularModule } from 'lucide-angular';
import { slideInOut, listStaggerTrigger } from '../../animations/animations';

@Component({
  selector: 'app-script-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, LucideAngularModule, DragDropModule],
  templateUrl: './script-builder.component.html',
  styleUrls: ['./script-builder.component.css'],
  animations: [slideInOut, listStaggerTrigger]
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
  newCritIsPenalty: boolean = false;

  // Controle de animacao de reordenacao (botoes cima/baixo)
  animatingIndex: number | null = null;
  animatingTargetIndex: number | null = null;
  isSnapping: boolean = false;

  constructor(
    private fb: FormBuilder,
    private scriptService: ScriptService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.scriptForm = this.fb.group({
      name: ['', Validators.required],
      criteria: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isEditMode = true;
        this.loadScriptForEdit(id);
      } else {
        this.resetForm();
      }
    });
  }

  loadScriptForEdit(id: string): void {
    this.loading = true;
    this.scriptService.getScript(id).subscribe({
      next: (found) => {
        if (found) {
          this.selectedScript = found;
          this.scriptForm.patchValue({
            name: found.name || ''
          });
          
          this.criteria.clear();
          if (found.criteria)
            found.criteria.forEach(c => this.addCriteria(c));
        } else {
          this.errorMessage = 'Roteiro nao encontrado.';
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar roteiro.';
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
      weight: [crit?.weight ?? 1, [Validators.required, Validators.min(-5), Validators.max(5)]],
      min: [crit?.min ?? 0],
      max: [crit?.max ?? 5]
    });

    this.criteria.push(critGroup);
  }

  removeCriteria(index: number): void {
    this.criteria.removeAt(index);
  }

  moveCriteria(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.criteria.length || toIndex < 0 || toIndex >= this.criteria.length)
      return;
    const control = this.criteria.at(fromIndex);
    this.criteria.removeAt(fromIndex);
    this.criteria.insert(toIndex, control);
  }

  moveCriteriaWithAnimation(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.criteria.length || toIndex < 0 || toIndex >= this.criteria.length)
      return;

    this.animatingIndex = fromIndex;
    this.animatingTargetIndex = toIndex;

    setTimeout(() => {
      this.isSnapping = true;
      this.moveCriteria(fromIndex, toIndex);
      this.animatingIndex = null;
      this.animatingTargetIndex = null;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.isSnapping = false;
        });
      });
    }, 240);
  }

  onCdkDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex)
      return;
    // Reordena o FormArray espelhando o moveItemInArray do CDK
    this.moveCriteria(event.previousIndex, event.currentIndex);
  }

  trackByCriteria(index: number): number {
    return index;
  }

  addCriteriaLocal(): void {
    if (!this.newCritLabel.trim())
      return;

    const weightValue = this.newCritType === 'text' ? 0 : (this.newCritIsPenalty ? -this.newCritWeight : this.newCritWeight);

    const newCrit: Criteria = {
      id: 'crit_' + Math.random().toString(36).substr(2, 9),
      label: this.newCritLabel.trim(),
      type: this.newCritType,
      isScorable: this.newCritType === 'text' ? false : this.newCritIsScorable,
      weight: this.newCritType === 'text' ? 0 : weightValue,
      min: this.newCritType === 'range' ? 0 : undefined,
      max: this.newCritType === 'range' ? 5 : undefined
    };

    this.addCriteria(newCrit);

    this.newCritLabel = '';
    this.newCritType = 'bool';
    this.newCritIsScorable = true;
    this.newCritWeight = 1;
    this.newCritIsPenalty = false;
  }

  onTypeChange(): void {
    if (this.newCritType === 'text') {
      this.newCritIsScorable = false;
      this.newCritWeight = 0;
      this.newCritIsPenalty = false;
    } else {
      this.newCritIsScorable = true;
      this.newCritWeight = 1;
    }
  }

  selectCritType(type: 'text' | 'bool' | 'range'): void {
    this.newCritType = type;
    this.onTypeChange();
  }

  resetForm(): void {
    this.selectedScript = null;
    this.isEditMode = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.criteria.clear();
    this.scriptForm.reset({
      name: ''
    });
    this.newCritIsPenalty = false;
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
