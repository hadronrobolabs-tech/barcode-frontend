import { Component, OnInit } from '@angular/core';
import { HistoryService } from '../../service/history.service';
import { KitService } from '../../service/kit.service';
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
  displayedColumns: string[] = ['barcode', 'component', 'category', 'product', 'scannedBy', 'time', 'status', 'remark'];
  dataSource = new MatTableDataSource<any>([]);

  constructor(
    private historyService: HistoryService,
    private kitService: KitService
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
    this.loadHistory();
    this.loadStatistics();
  }

  onKitChange() {
    this.loadHistory();
    this.loadStatistics();
  }

  getStatusClass(status: string): string {
    const statusUpper = status?.toUpperCase() || '';
    if (statusUpper === 'SUCCESS' || statusUpper === 'SCANNED' || statusUpper === 'BOXED') {
      return 'badge--success';
    } else if (statusUpper === 'PENDING' || statusUpper === 'CREATED') {
      return 'badge--pending';
    } else if (statusUpper === 'FAILED' || statusUpper === 'SCRAPPED') {
      return 'badge--failed';
    }
    return 'badge--pending';
  }
}
