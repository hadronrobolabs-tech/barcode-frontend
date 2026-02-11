import { Component, OnInit } from '@angular/core';
import { HistoryService } from '../../service/history.service';
import { KitService } from '../../service/kit.service';
import { BoxService } from '../../service/box.service';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-data-history',
  templateUrl: './data-history.component.html',
  styleUrls: ['./data-history.component.scss']
})
export class DataHistoryComponent implements OnInit {
  history: any[] = [];
  statistics: any = {
    total: 0,
    success: 0,
    pending: 0,
    failed: 0
  };
  loading = false;
  errorMessage = '';
  searchTerm = '';
  statusFilter = 'all';
  selectedKitId: number | null = null;
  kits: any[] = [];
  startDate = '';
  endDate = '';
  exportBoxStartDate = '';
  exportBoxEndDate = '';
  displayedColumns: string[] = ['barcode', 'component', 'category', 'product', 'scannedBy', 'time', 'status', 'boxHistory', 'remark'];
  dataSource = new MatTableDataSource<any>([]);

  constructor(
    private historyService: HistoryService,
    private kitService: KitService,
    private boxService: BoxService
  ) {}

  ngOnInit() {
    this.loadKits();
    this.loadHistory();
    this.loadStatistics();
  }

  loadKits() {
    this.kitService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.kits = response.data;
        }
      },
      error: (err) => {
        console.error('Failed to load kits', err);
      }
    });
  }

  loadHistory() {
    this.loading = true;
    this.errorMessage = '';

    const filters: any = {
      limit: 100,
      offset: 0
    };

    if (this.searchTerm.trim()) {
      filters.search = this.searchTerm.trim();
    }

    if (this.statusFilter !== 'all') {
      filters.status = this.statusFilter.toUpperCase();
    }

    if (this.startDate) {
      filters.start_date = this.startDate;
    }

    if (this.endDate) {
      filters.end_date = this.endDate;
    }

    if (this.selectedKitId) {
      filters.kit_id = this.selectedKitId;
    }

    this.historyService.getHistory(filters).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.history = response.data || [];
          this.dataSource.data = this.history;
          if (response.statistics) {
            this.statistics = response.statistics;
          }
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'Failed to load history';
      }
    });
  }

  loadStatistics() {
    const filters: any = {};
    if (this.startDate) filters.start_date = this.startDate;
    if (this.endDate) filters.end_date = this.endDate;
    if (this.selectedKitId) filters.kit_id = this.selectedKitId;

    this.historyService.getStatistics(filters).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statistics = response.data;
        }
      },
      error: (err) => {
        console.error('Failed to load statistics', err);
      }
    });
  }

  onSearch() {
    this.loadHistory();
  }

  onFilterChange() {
    this.loadHistory();
  }

  onDateChange() {
    this.loadHistory();
    this.loadStatistics();
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.selectedKitId = null;
    this.startDate = '';
    this.endDate = '';
    this.exportBoxStartDate = '';
    this.exportBoxEndDate = '';
    this.loadHistory();
    this.loadStatistics();
  }

  onKitChange() {
    this.loadHistory();
    this.loadStatistics();
  }

  exportHistory() {
    this.loading = true;
    this.errorMessage = '';

    const filters: any = {};

    if (this.searchTerm.trim()) {
      filters.search = this.searchTerm.trim();
    }

    if (this.statusFilter !== 'all') {
      filters.status = this.statusFilter.toUpperCase();
    }

    if (this.startDate) {
      filters.start_date = this.startDate;
    }

    if (this.endDate) {
      filters.end_date = this.endDate;
    }

    if (this.selectedKitId) {
      filters.kit_id = this.selectedKitId;
    }

    this.historyService.exportHistory(filters).subscribe({
      next: (blob: Blob) => {
        this.loading = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `history_export_${this.selectedKitId ? `kit_${this.selectedKitId}_` : ''}${new Date().getTime()}.csv`;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to export history';
      }
    });
  }

  exportBoxPackingData() {
    this.loading = true;
    this.errorMessage = '';

    const filters: any = {};
    if (this.selectedKitId) {
      filters.kit_id = this.selectedKitId;
    }
    if (this.exportBoxStartDate) {
      filters.start_date = this.exportBoxStartDate;
    }
    if (this.exportBoxEndDate) {
      filters.end_date = this.exportBoxEndDate;
    }

    this.boxService.exportBoxPacking(filters).subscribe({
      next: (blob: Blob) => {
        this.loading = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `box_packing_export_${this.selectedKitId ? `kit_${this.selectedKitId}_` : ''}${new Date().getTime()}.csv`;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to export box packing data';
      }
    });
  }

  getStatusClass(status: string): string {
    if (!status) return 'badge--pending';
    const statusUpper = status.toUpperCase();
    
    // Check for success statuses (scanned or boxed)
    if (statusUpper === 'SCANNED' || statusUpper === 'BOXED' || statusUpper === 'SUCCESS') {
      return 'badge--success';
    }
    
    // Check for pending/created statuses
    if (statusUpper === 'CREATED' || statusUpper === 'PENDING' || statusUpper === 'GENERATED') {
      return 'badge--pending';
    }
    
    // Check for failed/scrapped statuses
    if (statusUpper === 'SCRAPPED' || statusUpper === 'FAILED') {
      return 'badge--failed';
    }
    
    // Check for printed status (if used as status)
    if (statusUpper === 'PRINTED') {
      return 'badge--success';
    }
    
    // Default to pending for unknown statuses
    return 'badge--pending';
  }
}
