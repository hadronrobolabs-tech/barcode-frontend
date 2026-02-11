import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { KitService } from '../../service/kit.service';
import { BoxService } from '../../service/box.service';
import { BarcodeService } from '../../service/barcode.service';
import { AuthService } from '../../service/auth.service';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-box-packing',
  templateUrl: './box-packing.component.html',
  styleUrls: ['./box-packing.component.scss']
})
export class BoxPackingComponent implements OnInit, AfterViewInit {
  @ViewChild('boxBarcodeInput', { static: false }) boxBarcodeInput!: ElementRef;
  @ViewChild('scanInputField', { static: false }) scanInputField!: ElementRef;
  kits: any[] = [];
  selectedKitId: number | null = null;
  selectedKitName: string = '';
  requirements: any[] = [];
  scanInput = '';
  boxBarcode = '';
  boxBarcodeScanned = false;
  packingStarted = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  packingStatus: any = null;
  displayedColumns: string[] = ['index', 'component', 'category', 'required', 'scanned', 'scannedBarcodes', 'status', 'action'];
  requirementsDataSource = new MatTableDataSource<any>([]);

  constructor(
    private kitService: KitService,
    private boxService: BoxService,
    private barcodeService: BarcodeService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadKits();
  }

  ngAfterViewInit() {
    // Focus box barcode input initially
    this.focusBoxBarcodeInput();
  }

  focusBoxBarcodeInput() {
    setTimeout(() => {
      if (this.boxBarcodeInput?.nativeElement) {
        this.boxBarcodeInput.nativeElement.focus();
      }
    }, 100);
  }

  focusScanInput() {
    setTimeout(() => {
      if (this.scanInputField?.nativeElement) {
        this.scanInputField.nativeElement.focus();
      }
    }, 100);
  }

  loadKits() {
    this.loading = true;
    this.kitService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          this.kits = response.data;
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = 'Failed to load kits';
      }
    });
  }

  onKitSelect() {
    if (!this.selectedKitId) {
      this.requirements = [];
      this.packingStarted = false;
      this.selectedKitName = '';
      return;
    }

    const selectedKit = this.kits.find(k => k.id === this.selectedKitId);
    this.selectedKitName = selectedKit ? (selectedKit.kit_name || selectedKit.name) : '';

    this.loading = true;
    this.boxService.getRequirements(this.selectedKitId).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          // Backend returns { kit_id, kit_name, requirements: [...] }
          const data = response.data;
          this.selectedKitName = data.kit_name || this.selectedKitName;
          // Map requirements array - each requirement has component details
          this.requirements = (data.requirements || []).map((req: any) => ({
            id: req.component_id || req.id,
            component_id: req.component_id || req.id,
            component_name: req.component_name || req.name,
            category: req.category,
            category_name: req.category_name || req.category,
            required: req.required_quantity || 0,
            scanned: 0,
            status: 'Pending', // Initial status
            scannedBarcodes: [] as string[],
            barcodes: req.barcodes || []
          }));
          this.requirementsDataSource.data = [...this.requirements];
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to load kit requirements';
      }
    });
  }

  startPacking() {
    if (!this.boxBarcode.trim()) {
      this.errorMessage = 'Please enter box barcode';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const user = this.authService.getUser();
    const userId = user?.id || null;

    // First verify the box barcode
    this.barcodeService.previewScan(this.boxBarcode.trim()).subscribe({
      next: (previewResponse: any) => {
        if (previewResponse.success && previewResponse.data) {
          // Box barcode is valid, start packing (or resume existing session)
          // For existing sessions, kit_id will be auto-set from session
          // For new sessions, kit_id is required
          this.boxService.start({
            kit_id: this.selectedKitId || 0, // 0 will trigger error for new sessions, but existing sessions will work
            box_barcode: this.boxBarcode.trim(),
            packed_by: userId
          }).subscribe({
            next: (response) => {
              this.loading = false;
              if (response.success) {
                const data = response.data;
                
                // Check if this is an existing session
                if (data.existing_session && data.packing_status) {
                  // Existing session - load the packing status
                  this.packingStarted = true;
                  this.boxBarcodeScanned = true;
                  
                  // Load existing packing status (this will also load kit requirements)
                  this.loadExistingPackingStatus(data.packing_status);
                  
                  this.errorMessage = '';
                  // Focus scan input after loading existing session
                  setTimeout(() => this.focusScanInput(), 500);
                } else {
                  // New session
                  this.packingStarted = true;
                  this.boxBarcodeScanned = true;
                  this.successMessage = 'Box barcode verified! Packing session started. Now scan component barcodes.';
                  this.errorMessage = '';
                  this.loadPackingStatus();
                  // Focus scan input after starting new session
                  setTimeout(() => this.focusScanInput(), 500);
                }
              }
            },
            error: (err: any) => {
              this.loading = false;
              const errorMsg = err.error?.error || 'Failed to start packing session';
              if (errorMsg.includes('BOX_ALREADY_COMPLETED')) {
                this.errorMessage = 'This box has already been completed and cannot be used again.';
              } else if (errorMsg.includes('KIT_ID_REQUIRED') || errorMsg.includes('KIT_NOT_FOUND')) {
                this.errorMessage = 'Please select a kit first for new packing sessions.';
              } else {
                this.errorMessage = errorMsg;
              }
            }
          });
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = 'Invalid box barcode. Please scan a valid box barcode first.';
      }
    });
  }

  loadExistingPackingStatus(packingStatus: any) {
    if (!packingStatus || !packingStatus.requirements) return;

    // Update kit_id and kit name from existing session
    if (packingStatus.kit_id) {
      this.selectedKitId = packingStatus.kit_id;
      // Find kit name from kits list or use from status
      const kit = this.kits.find(k => k.id === packingStatus.kit_id);
      this.selectedKitName = kit ? (kit.kit_name || kit.name) : (packingStatus.kit_name || '');
    } else if (packingStatus.kit_name) {
      this.selectedKitName = packingStatus.kit_name;
    }

    // Load kit requirements first, then update with scanned counts
    if (packingStatus.kit_id) {
      this.loading = true;
      this.boxService.getRequirements(packingStatus.kit_id).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success && response.data) {
            const data = response.data;
            this.selectedKitName = data.kit_name || this.selectedKitName;
            
            // Map requirements array
            this.requirements = (data.requirements || []).map((req: any) => ({
              id: req.component_id || req.id,
              component_id: req.component_id || req.id,
              component_name: req.component_name || req.name,
              category: req.category,
              category_name: req.category_name || req.category,
              required: req.required_quantity || 0,
              scanned: 0, // Will be updated from packing status
              status: 'Pending',
              scannedBarcodes: [] as string[],
              barcodes: req.barcodes || []
            }));

            // Now update with scanned counts from existing session
            this.requirements.forEach(req => {
              const statusReq = packingStatus.requirements.find(
                (r: any) => r.component_id === req.component_id || 
                           r.id === req.component_id ||
                           (r.component_name === req.component_name && r.category_name === req.category_name)
              );
              if (statusReq) {
                req.scanned = statusReq.scanned || 0;
                req.status = statusReq.complete ? 'Success' : 'Pending';
              }
            });
            
            this.requirementsDataSource.data = [...this.requirements];
            
            // Show summary of what's already scanned
            const scannedCount = packingStatus.total_scanned || 0;
            const requiredCount = packingStatus.total_required || 0;
            const remaining = requiredCount - scannedCount;
            
            if (remaining > 0) {
              this.successMessage = `Resumed packing session. ${scannedCount} of ${requiredCount} components already scanned. ${remaining} remaining.`;
            } else {
              this.successMessage = `All components scanned! Click "Complete Packing" to finish.`;
            }
          }
        },
        error: (err) => {
          this.loading = false;
          console.error('Failed to load kit requirements', err);
        }
      });
    }
  }

  verifyScan() {
    if (!this.packingStarted || !this.boxBarcodeScanned) {
      this.errorMessage = 'Please start packing session and scan box barcode first';
      return;
    }

    const barcode = this.scanInput.trim();
    if (!barcode) {
      this.errorMessage = 'Please scan a barcode';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const user = this.authService.getUser();
    const userId = user?.id || null;

    this.boxService.scan({
      box_barcode: this.boxBarcode.trim(),
      item_barcode: barcode,
      user_id: userId
    }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          const scannedComponent = response.data.component;
          const progress = response.data.progress;
          
          // Update the requirement that matches this component
          const requirement = this.requirements.find(
            req => req.component_id === scannedComponent?.id || 
                   req.component_name === scannedComponent?.name
          );
          
          if (requirement) {
            requirement.scanned = progress?.component_counts?.[scannedComponent.id] || requirement.scanned + 1;
            requirement.status = requirement.scanned >= requirement.required ? 'Success' : 'Pending';
            if (!requirement.scannedBarcodes.includes(barcode)) {
              requirement.scannedBarcodes.push(barcode);
            }
            this.requirementsDataSource.data = [...this.requirements];
          }

          // Check if all components are scanned
          const allComplete = this.requirements.every(req => req.scanned >= req.required);
          if (allComplete) {
            this.successMessage = `All components scanned! Click "Complete Packing" to save.`;
          } else {
            this.successMessage = `Component "${scannedComponent?.name || 'Unknown'}" scanned successfully! (${progress?.scanned || 0}/${progress?.required || 0})`;
          }
          
          this.scanInput = '';
          this.loadPackingStatus();
          // Refocus input for next scan
          this.focusScanInput();
        }
      },
      error: (err) => {
        this.loading = false;
        const errorMsg = err.error?.error || 'Invalid component scan';
        if (errorMsg.includes('ALREADY_BOXED') || errorMsg.includes('already')) {
          this.errorMessage = 'This barcode has already been packed in another box.';
        } else if (errorMsg.includes('QUANTITY_EXCEEDED')) {
          this.errorMessage = 'Required quantity for this component has already been met.';
        } else {
          this.errorMessage = errorMsg;
        }
        this.scanInput = '';
        // Refocus input after error
        this.focusScanInput();
      }
    });
  }

  loadPackingStatus() {
    if (!this.boxBarcode.trim()) return;

    this.boxService.getStatus(this.boxBarcode.trim()).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.packingStatus = response.data;
          // Update requirements with scanned counts and status from backend
          if (this.packingStatus.requirements) {
            this.requirements.forEach(req => {
              const statusReq = this.packingStatus.requirements.find(
                (r: any) => r.component_id === req.component_id || 
                           r.id === req.component_id ||
                           (r.component_name === req.component_name && r.category_name === req.category_name)
              );
              if (statusReq) {
                req.scanned = statusReq.scanned || 0;
                req.status = statusReq.status || (req.scanned >= req.required ? 'Success' : 'Pending');
                // Update scanned barcodes if available from backend
                if (statusReq.scanned_barcodes && Array.isArray(statusReq.scanned_barcodes)) {
                  req.scannedBarcodes = statusReq.scanned_barcodes;
                }
              }
            });
            this.requirementsDataSource.data = [...this.requirements];
          }
        }
      },
      error: (err) => {
        console.error('Failed to load packing status', err);
      }
    });
  }

  completePacking() {
    if (!this.boxBarcode.trim()) {
      this.errorMessage = 'No active packing session';
      return;
    }

    // Check if all requirements are met before completing
    const allComplete = this.requirements.every(req => req.scanned >= req.required);
    if (!allComplete) {
      const missing = this.requirements.filter(req => req.scanned < req.required);
      const missingList = missing.map(m => `${m.component_name} (${m.scanned}/${m.required})`).join(', ');
      this.errorMessage = `All components must be scanned before completing. Missing: ${missingList}`;
      return;
    }

    this.loading = true;
    const user = this.authService.getUser();
    const userId = user?.id || null;

    this.boxService.complete({
      box_barcode: this.boxBarcode.trim(),
      user_id: userId
    }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.successMessage = 'Box packing completed and saved successfully!';
          setTimeout(() => {
            this.resetPackingSession();
          }, 2000);
        }
      },
      error: (err) => {
        this.loading = false;
        const errorMsg = err.error?.error || 'Failed to complete packing';
        if (errorMsg.includes('missing') || errorMsg.includes('required')) {
          this.errorMessage = errorMsg;
        } else {
          this.errorMessage = 'Failed to complete packing. Please ensure all components are scanned.';
        }
      }
    });
  }

  resetPackingSession() {
    this.selectedKitId = null;
    this.selectedKitName = '';
    this.requirements = [];
    this.requirementsDataSource.data = [];
    this.scanInput = '';
    this.boxBarcode = '';
    this.boxBarcodeScanned = false;
    this.packingStarted = false;
    this.packingStatus = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  areAllComponentsScanned(): boolean {
    if (this.requirements.length === 0) return false;
    return this.requirements.every(req => req.scanned >= req.required);
  }

  removeLastScannedComponent(requirement: any) {
    if (!requirement.scannedBarcodes || requirement.scannedBarcodes.length === 0) {
      return;
    }
    const lastBarcode = requirement.scannedBarcodes[requirement.scannedBarcodes.length - 1];
    this.removeScannedComponent(requirement, lastBarcode);
  }

  removeScannedComponent(requirement: any, barcode: string) {
    if (!this.boxBarcode.trim() || !barcode) {
      this.errorMessage = 'Invalid request';
      return;
    }

    if (!confirm(`Remove barcode "${barcode}" from this box?`)) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const user = this.authService.getUser();
    const userId = user?.id || null;

    this.boxService.removeItem({
      box_barcode: this.boxBarcode.trim(),
      item_barcode: barcode,
      user_id: userId
    }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          const progress = response.data.progress;
          
          // Update the requirement
          if (requirement) {
            requirement.scanned = progress?.component_counts?.[requirement.component_id] || Math.max(0, requirement.scanned - 1);
            requirement.status = requirement.scanned >= requirement.required ? 'Success' : 'Pending';
            // Remove barcode from scanned list
            const barcodeIndex = requirement.scannedBarcodes.indexOf(barcode);
            if (barcodeIndex > -1) {
              requirement.scannedBarcodes.splice(barcodeIndex, 1);
            }
            this.requirementsDataSource.data = [...this.requirements];
          }

          this.successMessage = `Component barcode removed successfully. (${progress?.scanned || 0}/${progress?.required || 0})`;
          this.loadPackingStatus();
          this.focusScanInput();
        }
      },
      error: (err) => {
        this.loading = false;
        const errorMsg = err.error?.error || 'Failed to remove component';
        if (errorMsg.includes('COMPLETED')) {
          this.errorMessage = 'Cannot remove items from a completed box.';
        } else {
          this.errorMessage = errorMsg;
        }
        this.focusScanInput();
      }
    });
  }
}
