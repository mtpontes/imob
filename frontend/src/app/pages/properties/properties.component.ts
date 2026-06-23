import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { EvaluationService } from '../../services/evaluation.service';
import { PropertyResponse } from '../../types';
import { ScriptService } from '../../services/script.service';
import { LucideAngularModule } from 'lucide-angular';
import { dropdownTrigger, listStaggerTrigger } from '../../animations/animations';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './properties.component.html',
  styleUrls: ['./properties.component.css'],
  animations: [dropdownTrigger, listStaggerTrigger]
})
export class PropertiesComponent implements OnInit {
  properties: PropertyResponse[] = [];
  filteredProperties: PropertyResponse[] = [];
  propertyScores: { [key: string]: number } = {};
  propertyEvaluationsCount: { [key: string]: number } = {};
  
  searchQuery: string = '';
  sortBy: string = 'recent';
  statusFilter: string = 'all';
  
  isSortDropdownOpen = false;
  isFilterDropdownOpen = false;
  
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private propertyService: PropertyService,
    private evaluationService: EvaluationService,
    private scriptService: ScriptService,
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
            const latestEval = sorted[0];
            this.scriptService.getScript(latestEval.scriptId).subscribe({
              next: (script) => {
                this.propertyScores[p.id] = this.evaluationService.calculateScore(script, latestEval.answers);
                this.propertyEvaluationsCount[p.id] = evals.length;
                this.applyFilterAndSort();
              },
              error: () => {
                this.propertyScores[p.id] = 0;
                this.propertyEvaluationsCount[p.id] = evals.length;
                this.applyFilterAndSort();
              }
            });
          } else {
            this.propertyEvaluationsCount[p.id] = 0;
            this.applyFilterAndSort();
          }
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

  toggleSortDropdown(): void {
    this.isSortDropdownOpen = !this.isSortDropdownOpen;
    this.isFilterDropdownOpen = false;
  }

  toggleFilterDropdown(): void {
    this.isFilterDropdownOpen = !this.isFilterDropdownOpen;
    this.isSortDropdownOpen = false;
  }

  selectSort(option: string): void {
    this.sortBy = option;
    this.isSortDropdownOpen = false;
    this.applyFilterAndSort();
  }

  selectFilter(option: string): void {
    this.statusFilter = option;
    this.isFilterDropdownOpen = false;
    this.applyFilterAndSort();
  }

  getSortLabel(): string {
    switch (this.sortBy) {
      case 'recent': return 'Mais Recentes';
      case 'price-asc': return 'Menor Preço';
      case 'price-desc': return 'Maior Preço';
      case 'sqm-desc': return 'Maior Área (m²)';
      default: return 'Ordenar por';
    }
  }

  getFilterLabel(): string {
    switch (this.statusFilter) {
      case 'all': return 'Todos os Imóveis';
      case 'evaluated': return 'Avaliados';
      case 'pending': return 'Não Avaliados';
      default: return 'Filtrar por';
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-container')) {
      this.isSortDropdownOpen = false;
      this.isFilterDropdownOpen = false;
    }
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
