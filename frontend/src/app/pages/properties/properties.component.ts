import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { EvaluationService } from '../../services/evaluation.service';
import { PropertyResponse } from '../../types';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './properties.component.html',
  styleUrls: ['./properties.component.css']
})
export class PropertiesComponent implements OnInit {
  properties: PropertyResponse[] = [];
  filteredProperties: PropertyResponse[] = [];
  propertyScores: { [key: string]: number } = {};
  propertyEvaluationsCount: { [key: string]: number } = {};
  
  searchQuery: string = '';
  sortBy: string = 'recent';
  statusFilter: string = 'all';
  
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private propertyService: PropertyService,
    private evaluationService: EvaluationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    this.loading = true;
    this.propertyService.getProperties().subscribe({
      next: (res) => {
        this.properties = res;
        this.applyFilterAndSort();
        this.loadScoresForProperties();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Erro ao carregar imoveis.';
        this.loading = false;
      }
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
          this.applyFilterAndSort();
        },
        error: () => {
          this.propertyEvaluationsCount[p.id] = 0;
          this.applyFilterAndSort();
        }
      });
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.applyFilterAndSort();
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortBy = select.value;
    this.applyFilterAndSort();
  }

  onStatusFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.statusFilter = select.value;
    this.applyFilterAndSort();
  }

  applyFilterAndSort(): void {
    let result = [...this.properties];
    const query = this.searchQuery.toLowerCase().trim();

    // Filtro de Busca por Texto
    if (query) {
      result = result.filter(p => p.address.toLowerCase().includes(query));
    }

    // Filtro de Status de Avaliação
    if (this.statusFilter === 'evaluated') {
      result = result.filter(p => this.propertyEvaluationsCount[p.id] !== undefined && this.propertyEvaluationsCount[p.id] > 0);
    } else if (this.statusFilter === 'pending') {
      result = result.filter(p => this.propertyEvaluationsCount[p.id] === undefined || this.propertyEvaluationsCount[p.id] === 0);
    }

    // Ordenação
    if (this.sortBy === 'recent') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (this.sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (this.sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (this.sortBy === 'sqm-desc') {
      result.sort((a, b) => b.sqm - a.sqm);
    }

    this.filteredProperties = result;
  }

  navigateToDetails(propertyId: string): void {
    this.router.navigate(['/properties', propertyId]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/properties/create']);
  }
}
