import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { BarcodeService } from '../../service/barcode.service';
import { ScanService } from '../../service/scan.service';
import { AuthService } from '../../service/auth.service';
import { MatTableDataSource } from '@angular/material/table';

interface ScanItem {
  barcode: string;
  barcode_id?: number;
  componentName: string;
  category: string;
  scannedAt?: Date;
  scannedBy?: string;
  status?: string;
  current_status?: string;
  product?: string;
  pending?: boolean; // true if not yet saved to database
}

@Component({
  selector: 'app-component-scan',
  templateUrl: './component-scan.component.html',
  styleUrls: ['./component-scan.component.scss']
})
export class ComponentScanComponent implements AfterViewInit {
  @ViewChild('barcodeInputField', { static: false }) barcodeInputField!: ElementRef;
  barcodeInput = '';
  scannedItem: ScanItem | null = null;
  scanHistory: ScanItem[] = [];
  dataSource = new MatTableDataSource<ScanItem>([]);
  loading = false;
  errorMessage = '';
  successMessage = '';
  displayedColumns: string[] = ['barcode', 'component', 'category', 'status', 'user', 'time', 'action'];

  constructor(
    private barcodeService: BarcodeService,
    private scanService: ScanService,
    private authService: AuthService
  ) {}

  ngAfterViewInit() {
    // Focus the input field when component loads
    this.focusInput();
  }

  focusInput() {
    setTimeout(() => {
      if (this.barcodeInputField?.nativeElement) {
        this.barcodeInputField.nativeElement.focus();
      }
    }, 100);
  }

  // Preview/Validate barcode without saving
  scan() {
    if (!this.barcodeInput.trim()) {
      this.errorMessage = 'Please scan or enter a barcode';
      return;
    }

    const barcodeValue = this.barcodeInput.trim();

    // Check if already in pending list
    const existingPending = this.scanHistory.find(item => 
      item.barcode === barcodeValue && item.pending
    );
    if (existingPending) {
      this.errorMessage = 'This barcode is already in the pending list';
      return;
    }

    // Check if already saved (scanned and submitted)
    const existingSaved = this.scanHistory.find(item => 
      item.barcode === barcodeValue && !item.pending
    );
    if (existingSaved) {
      this.errorMessage = 'This barcode has already been scanned and submitted';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Preview barcode (doesn't save to database)
    this.barcodeService.preview({
      barcode: barcodeValue
    }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          const data = response.data;
          
          // Check if barcode is already scanned (status = 'SCANNED' or 'BOXED')
          if (data.current_status === 'SCANNED' || data.current_status === 'BOXED') {
            this.errorMessage = `This barcode has already been scanned (Status: ${data.current_status}). It cannot be scanned again.`;
            this.scannedItem = null;
            return;
          }

          const scannedItem: ScanItem = {
            barcode: data.barcode,
            barcode_id: data.barcode_id,
            componentName: data.component || 'Unknown',
            category: data.category || 'UNKNOWN',
            current_status: data.current_status,
            product: data.product || null,
            pending: true // Mark as pending (not saved yet)
          };
          
          this.scannedItem = scannedItem;
          
          // Automatically add to pending list
          this.scanHistory.unshift({ ...scannedItem });
          this.dataSource.data = [...this.scanHistory];
          
          this.successMessage = 'Barcode validated! Click "Submit Scans" to save to database.';
          
          // Clear input after showing result
          this.barcodeInput = '';
          // Refocus input field for next scan
          this.focusInput();
          setTimeout(() => {
            this.scannedItem = null;
          }, 3000);
        }
      },
      error: (err) => {
        this.loading = false;
        const errorMsg = err.error?.error || err.error?.message || 'Failed to validate barcode';
        // Check if error indicates already scanned
        if (errorMsg.includes('SCANNED') || errorMsg.includes('BOXED') || errorMsg.includes('already')) {
          this.errorMessage = `This barcode has already been scanned. It cannot be scanned again.`;
        } else {
          this.errorMessage = errorMsg;
        }
        this.scannedItem = null;
        // Refocus input field after error
        this.focusInput();
      }
    });
  }

  // Submit all pending scans to database
  submitScans() {
    const pendingScans = this.scanHistory.filter(item => item.pending);
    if (pendingScans.length === 0) {
      this.errorMessage = 'No pending scans to submit';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const user = this.authService.getUser();
    const userId = user?.id || null;

    // Submit scans sequentially
    let completed = 0;
    let failed = 0;
    const total = pendingScans.length;

    const submitNext = (index: number) => {
      if (index >= pendingScans.length) {
        // All done
        this.loading = false;
        if (failed === 0) {
          this.successMessage = `Successfully submitted ${completed} scan(s) to database!`;
        } else {
          this.successMessage = `Submitted ${completed} scan(s). ${failed} failed.`;
        }
        // Refocus input after submit
        this.focusInput();
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        return;
      }

      const item = pendingScans[index];
      this.scanService.scan({
        barcode: item.barcode,
        user_id: userId
      }).subscribe({
        next: (response) => {
          completed++;
          // Update item in history - mark as saved
          const historyItem = this.scanHistory.find(h => h.barcode === item.barcode && h.pending);
          if (historyItem && response.success && response.data) {
            historyItem.pending = false;
            historyItem.status = response.data.status || 'SCANNED';
            historyItem.scannedAt = new Date(response.data.scanned_at || new Date());
            historyItem.scannedBy = response.data.user || user?.email || 'Unknown';
            this.dataSource.data = [...this.scanHistory];
          }
          // Submit next
          submitNext(index + 1);
        },
        error: (err) => {
          failed++;
          // Continue with next scan even if this one failed
          submitNext(index + 1);
        }
      });
    };

    // Start submitting from first item
    submitNext(0);
  }

  // Remove item from pending list
  removePending(item: ScanItem) {
    const index = this.scanHistory.findIndex(h => 
      h.barcode === item.barcode && h.pending
    );
    if (index !== -1) {
      this.scanHistory.splice(index, 1);
      this.dataSource.data = [...this.scanHistory];
    }
  }

  // Unscan an already submitted barcode (reset status from SCANNED to CREATED)
  unscanBarcode(item: ScanItem) {
    if (!item.barcode || item.pending) {
      return;
    }

    if (!confirm(`Unscan barcode "${item.barcode}"? This will reset its status to CREATED and allow it to be scanned again.`)) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const user = this.authService.getUser();
    const userId = user?.id || null;

    this.barcodeService.unscan({
      barcode: item.barcode,
      user_id: userId
    }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          // Update item in history
          const historyItem = this.scanHistory.find(h => h.barcode === item.barcode && !h.pending);
          if (historyItem) {
            historyItem.status = 'CREATED';
            historyItem.current_status = 'CREATED';
            historyItem.pending = false;
            this.dataSource.data = [...this.scanHistory];
          }
          this.successMessage = `Barcode "${item.barcode}" unscan successfully! Status reset to CREATED.`;
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
          this.focusInput();
        }
      },
      error: (err) => {
        this.loading = false;
        const errorMsg = err.error?.error || 'Failed to unscan barcode';
        if (errorMsg.includes('BOXED')) {
          this.errorMessage = 'Cannot unscan barcodes that are already boxed.';
        } else if (errorMsg.includes('SCANNED')) {
          this.errorMessage = 'Can only unscan barcodes with SCANNED status.';
        } else {
          this.errorMessage = errorMsg;
        }
        this.focusInput();
      }
    });
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Getters for template
  get pendingCount(): number {
    return this.scanHistory.filter(s => s.pending).length;
  }

  get savedCount(): number {
    return this.scanHistory.filter(s => !s.pending).length;
  }

  get hasPendingScans(): boolean {
    return this.pendingCount > 0;
  }

  // Export scanned barcodes (not boxed) to CSV/Excel
  exportScannedBarcodes() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.barcodeService.exportScannedNotBoxed().subscribe({
      next: (blob: Blob) => {
        this.loading = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `scanned_barcodes_${new Date().getTime()}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.successMessage = 'Scanned barcodes exported successfully!';
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to export scanned barcodes';
      }
    });
  }
}
