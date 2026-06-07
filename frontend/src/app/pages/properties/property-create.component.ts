import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-property-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './property-create.component.html',
  styleUrls: ['./property-create.component.css']
})
export class PropertyCreateComponent {
  propertyForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  loading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private propertyService: PropertyService,
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
      next: (res) => {
        this.loading = false;
        this.successMessage = 'Imovel cadastrado com sucesso!';
        this.router.navigate(['/properties', res.id]);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erro ao cadastrar imovel.';
      }
    });
  }
}
