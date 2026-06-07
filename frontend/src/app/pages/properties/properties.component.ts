import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { EvaluationService } from '../../services/evaluation.service';
import { PropertyResponse } from '../../types';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './properties.component.html',
  styleUrls: ['./properties.component.css']
})
export class PropertiesComponent implements OnInit {
  properties: PropertyResponse[] = [];
  propertyScores: { [key: string]: number } = {};
  propertyEvaluationsCount: { [key: string]: number } = {};
  propertyForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private propertyService: PropertyService,
    private evaluationService: EvaluationService,
    private router: Router
  ) {
    this.propertyForm = this.fb.group({
      address: ['', Validators.required],
      price: ['', [Validators.required, (control: any) => {
        if (!control.value) return null;
        const num = Number(control.value.toString().replace(/\./g, ''));
        return num >= 0 ? null : { min: true };
      }]],
      sqm: ['', [Validators.required, Validators.min(1)]],
      bedrooms: ['', [Validators.required, Validators.min(0)]],
      bathrooms: ['', [Validators.required, Validators.min(0)]],
      parking: [0, [Validators.required, Validators.min(0)]],
      url: ['']
    });
  }

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    this.propertyService.getProperties().subscribe({
      next: (res) => {
        this.properties = res;
        this.loadScoresForProperties();
      },
      error: () => this.errorMessage = 'Erro ao carregar imóveis.'
    });
  }

  loadScoresForProperties(): void {
    this.properties.forEach(p => {
      this.evaluationService.getEvaluationsByProperty(p.id).subscribe({
        next: (evals) => {
          if (evals && evals.length > 0) {
            const sorted = evals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            this.propertyScores[p.id] = sorted[0].finalScore;
            this.propertyEvaluationsCount[p.id] = evals.length;
          } else {
            this.propertyEvaluationsCount[p.id] = 0;
          }
        },
        error: () => {
          this.propertyEvaluationsCount[p.id] = 0;
        }
      });
    });
  }

  formatPrice(value: string): string {
    if (!value) return '';
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return '';
    return Number(cleanValue).toLocaleString('pt-BR');
  }

  onPriceInput(event: any): void {
    const input = event.target as HTMLInputElement;
    const cleanValue = input.value.replace(/\D/g, '');
    const formatted = this.formatPrice(cleanValue);
    this.propertyForm.get('price')?.setValue(formatted, { emitEvent: false });
  }

  blockNegative(event: KeyboardEvent): void {
    if (event.key === '-' || event.key === 'e' || event.key === 'E') {
      event.preventDefault();
    }
  }

  blockNegativeAndDecimal(event: KeyboardEvent): void {
    if (event.key === '-' || event.key === 'e' || event.key === 'E' || event.key === ',' || event.key === '.') {
      event.preventDefault();
    }
  }

  onSubmit(): void {
    if (this.propertyForm.invalid) {
      this.errorMessage = 'Preencha todos os campos obrigatorios corretamente.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = { ...this.propertyForm.value };
    const priceStr = payload.price ? payload.price.toString().replace(/\./g, '') : '0';
    payload.price = Number(priceStr);
    payload.sqm = Math.abs(Number(payload.sqm));
    payload.bedrooms = Math.abs(Number(payload.bedrooms));
    payload.bathrooms = Math.abs(Number(payload.bathrooms));
    payload.parking = Math.abs(Number(payload.parking));

    this.propertyService.createProperty(payload).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Imovel cadastrado com sucesso!';
        this.propertyForm.reset({
          address: '',
          price: '',
          sqm: '',
          bedrooms: '',
          bathrooms: '',
          parking: 0,
          url: ''
        });
        this.loadProperties();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erro ao cadastrar imovel.';
      }
    });
  }

  evaluateProperty(propertyId: string): void {
    this.router.navigate(['/evaluate', propertyId]);
  }
}
