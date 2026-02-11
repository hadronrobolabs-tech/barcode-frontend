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
  component_id?: number;
  isParent?: boolean; // true if this component has child sub-components
  childComponents?: ChildComponent[]; // Child sub-components that need to be scanned
  scannedChildComponents?: Array<{ component_id: number; barcode_value: string }>; // Track scanned child components by component_id and barcode
}

interface ChildComponent {
  component_id: number;
  component_name: string;
  category: string;
  required_quantity: number;
  available_barcodes: Array<{ id: number; barcode_value: string; status: string }>;
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

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Preview barcode (doesn't save to database) - uses previewScan which includes childComponents
    this.barcodeService.previewScan(barcodeValue).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          const data = response.data;
          
          // Check if barcode is already scanned (status = 'SCANNED' or 'BOXED')
          if (data.status === 'SCANNED' || data.status === 'BOXED') {
            this.errorMessage = `This barcode has already been scanned (Status: ${data.status}). It cannot be scanned again.`;
            this.scannedItem = null;
            return;
          }

          // FIRST: Check if this barcode is a child of a pending parent component
          // Check by matching component_id (any barcode of child component type should work)
          let parentItem = null;
          
          if (data.component?.id) {
            parentItem = this.scanHistory.find(item => {
              if (!item.pending || !item.isParent || !item.childComponents) return false;
              return item.childComponents.some((child: ChildComponent) => 
                child.component_id === data.component.id
              );
            });
          }
          
          // If this is a child barcode of a pending parent
          if (parentItem) {
            // Initialize scannedChildComponents array if not exists
            if (!parentItem.scannedChildComponents) {
              parentItem.scannedChildComponents = [];
            }
            
            // Check if this child component is already scanned enough times
            const childComponent = parentItem.childComponents?.find((child: ChildComponent) => 
              child.component_id === data.component.id
            );
            
            if (!childComponent) {
              this.errorMessage = 'Child component not found in parent requirements.';
              this.barcodeInput = '';
              this.focusInput();
              return;
            }
            
            // Count how many times this child component has been scanned
            const scannedCount = parentItem.scannedChildComponents.filter(
              sc => sc.component_id === data.component.id
            ).length;
            
            // Check if we've already scanned enough of this child component
            if (scannedCount >= childComponent.required_quantity) {
              this.errorMessage = `Already scanned ${scannedCount} barcode(s) for child component "${childComponent.component_name}". Required: ${childComponent.required_quantity}.`;
              this.barcodeInput = '';
              this.focusInput();
              return;
            }
            
            // Check if this specific barcode was already scanned
            const alreadyScanned = parentItem.scannedChildComponents.some(
              sc => sc.barcode_value === barcodeValue
            );
            
            if (alreadyScanned) {
              this.errorMessage = 'This child barcode has already been scanned for the parent component.';
              this.barcodeInput = '';
              this.focusInput();
              return;
            }
            
            // Add to parent's scanned child components list
            parentItem.scannedChildComponents.push({
              component_id: data.component.id,
              barcode_value: barcodeValue
            });
            
            // Debug: Log child barcode addition
            console.log('Child barcode added:', barcodeValue, 'for component_id:', data.component.id);
            console.log('Parent scannedChildComponents:', parentItem.scannedChildComponents);
            
            // Force update the scanHistory array reference to trigger change detection
            const parentBarcode = parentItem.barcode;
            const updatedScannedChildren = [...parentItem.scannedChildComponents];
            this.scanHistory = this.scanHistory.map(item => {
              if (item.barcode === parentBarcode && item.pending) {
                return { ...item, scannedChildComponents: updatedScannedChildren };
              }
              return item;
            });
            this.dataSource.data = [...this.scanHistory];
            
            // Store parentItem in a const to help TypeScript narrowing
            const currentParent = parentItem;
            const scannedChildren = currentParent.scannedChildComponents || [];
            
            // Check if all required child components are scanned
            const remainingChildren = currentParent.childComponents?.filter((child: ChildComponent) => {
              const scannedForThisChild = scannedChildren.filter(
                sc => sc.component_id === child.component_id
              ).length;
              return scannedForThisChild < child.required_quantity;
            }) || [];
            
            if (remainingChildren.length > 0) {
              const remainingNames = remainingChildren.map((child: ChildComponent) => {
                const scannedForThisChild = scannedChildren.filter(
                  sc => sc.component_id === child.component_id
                ).length;
                const needed = child.required_quantity - scannedForThisChild;
                return `${child.component_name} (${needed} more)`;
              }).join(', ');
              
              this.successMessage = `Child barcode scanned! Remaining: ${remainingNames} for parent "${currentParent.componentName}".`;
            } else {
              // All required child components are scanned
              this.successMessage = `All child barcodes scanned for parent "${currentParent.componentName}"! You can now submit.`;
            }
            this.barcodeInput = '';
            this.focusInput();
            return; // IMPORTANT: Return here, don't add child as separate item
          }

          // SECOND: Check if this is a parent component with child sub-components
          const childComponents = data.childComponents || [];
          const isParent = childComponents.length > 0;

          const scannedItem: ScanItem = {
            barcode: data.barcode_value,
            barcode_id: data.barcode_id,
            componentName: data.component?.name || 'Unknown',
            category: data.component?.category || 'UNKNOWN',
            current_status: data.status,
            product: data.product?.name || null,
            component_id: data.component?.id,
            isParent: isParent,
            childComponents: childComponents,
            scannedChildComponents: [], // Track scanned child components by component_id
            pending: true // Mark as pending (not saved yet)
          };
          
          this.scannedItem = scannedItem;
          
          // Automatically add to pending list
          this.scanHistory.unshift({ ...scannedItem });
          this.dataSource.data = [...this.scanHistory];
          
          if (isParent) {
            // Build child names list for message
            const childNames = childComponents.map((child: ChildComponent) => 
              `${child.component_name} (Qty: ${child.required_quantity})`
            ).join(', ');
            const totalRequired = childComponents.reduce((sum: number, child: ChildComponent) => sum + child.required_quantity, 0);
            this.successMessage = `Parent component detected! Required child components: ${childNames}. Please scan ${totalRequired} child barcode(s) (any barcode of each child component type) before submitting.`;
          } else {
            this.successMessage = 'Barcode validated! Click "Submit Scans" to save to database.';
          }
          
          // Clear input after showing result
          this.barcodeInput = '';
          // Refocus input field for next scan
          this.focusInput();
          setTimeout(() => {
            this.scannedItem = null;
          }, 5000); // Show longer for parent components
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

    // Check if any parent components have unscanned child components
    // IMPORTANT: Only check parent components, normal components can submit without validation
    for (const item of pendingScans) {
      // Only validate if it's a parent component with child components
      if (item.isParent && item.childComponents && item.childComponents.length > 0) {
        const scannedChildComponents = item.scannedChildComponents || [];
        
        // Debug: Log the validation check
        console.log('Submit validation for parent:', item.componentName);
        console.log('Child components:', item.childComponents);
        console.log('Scanned child components:', scannedChildComponents);
        
        // Check if all required child components are scanned (by component_id and count)
        const missingChildren = item.childComponents.filter((child: ChildComponent) => {
          const scannedForThisChild = scannedChildComponents.filter(
            sc => sc.component_id === child.component_id
          ).length;
          return scannedForThisChild < child.required_quantity;
        });
        
        console.log('Missing children:', missingChildren);
        
        if (missingChildren.length > 0) {
          const missingNames = missingChildren.map((child: ChildComponent) => {
            const scannedForThisChild = scannedChildComponents.filter(
              sc => sc.component_id === child.component_id
            ).length;
            const needed = child.required_quantity - scannedForThisChild;
            return `${child.component_name} (${needed} more)`;
          }).join(', ');
          
          this.errorMessage = `Parent component "${item.componentName}" requires more child barcodes: ${missingNames}. Please scan before submitting.`;
          return; // Stop submission if any parent is missing child components
        }
      }
      // If not a parent component (isParent is false or undefined), skip validation - allow normal flow
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const user = this.authService.getUser();
    const userId = user?.id || null;

    // Submit scans sequentially
    // IMPORTANT: Submit parent components first, then their child components
    let completed = 0;
    let failed = 0;
    
    // Separate parent and normal components
    const parentScans = pendingScans.filter(item => item.isParent);
    const normalScans = pendingScans.filter(item => !item.isParent);
    
    // Map to track parent barcode IDs: parent barcode value -> parent barcode ID
    const parentBarcodeIdMap: {[key: string]: number} = {};
    
    // Build submission queue: parents first, then normal components
    const submissionQueue: ScanItem[] = [];
    
    // Add parent components first
    for (const parentItem of parentScans) {
      submissionQueue.push(parentItem);
    }
    
    // Add normal components
    for (const normalItem of normalScans) {
      submissionQueue.push(normalItem);
    }

    const submitNext = (index: number) => {
      if (index >= submissionQueue.length) {
        // All parent/normal components done - now submit child barcodes linked to their parents
        submitChildBarcodes();
        return;
      }

      const item = submissionQueue[index];
      
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
            
            // If this is a parent component, store its barcode_id for linking children
            if (item.isParent && response.data.barcode_id) {
              parentBarcodeIdMap[item.barcode] = response.data.barcode_id;
            }
            
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
    
    // Function to submit child barcodes linked to their parents
    const submitChildBarcodes = () => {
      let childCompleted = 0;
      let childFailed = 0;
      const childQueue: Array<{barcode: string, parentBarcodeId: number}> = [];
      
      // Build child barcode submission queue
      for (const parentItem of parentScans) {
        const scannedChildren = parentItem.scannedChildComponents || [];
        const parentBarcodeId = parentBarcodeIdMap[parentItem.barcode];
        
        if (parentBarcodeId) {
          for (const child of scannedChildren) {
            childQueue.push({
              barcode: child.barcode_value,
              parentBarcodeId: parentBarcodeId
            });
          }
        }
      }
      
      if (childQueue.length === 0) {
        // No child barcodes to submit
        this.loading = false;
        if (failed === 0 && childFailed === 0) {
          this.successMessage = `Successfully submitted ${completed} scan(s) to database!`;
        } else {
          this.successMessage = `Submitted ${completed} scan(s). ${failed + childFailed} failed.`;
        }
        this.focusInput();
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
        return;
      }
      
      const submitChildNext = (childIndex: number) => {
        if (childIndex >= childQueue.length) {
          // All child barcodes submitted
          this.loading = false;
          if (failed === 0 && childFailed === 0) {
            this.successMessage = `Successfully submitted ${completed + childCompleted} scan(s) to database!`;
          } else {
            this.successMessage = `Submitted ${completed + childCompleted} scan(s). ${failed + childFailed} failed.`;
          }
          this.focusInput();
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
          return;
        }
        
        const childItem = childQueue[childIndex];
        
        // Submit child barcode and link to parent
        this.scanService.scan({
          barcode: childItem.barcode,
          user_id: userId,
          parent_barcode_id: childItem.parentBarcodeId
        }).subscribe({
          next: (response) => {
            childCompleted++;
            submitChildNext(childIndex + 1);
          },
          error: (err) => {
            childFailed++;
            submitChildNext(childIndex + 1);
          }
        });
      };
      
      submitChildNext(0);
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

  // Get scanned count for a specific child component
  getScannedCountForChild(item: ScanItem, child: ChildComponent): number {
    if (!item.scannedChildComponents) return 0;
    return item.scannedChildComponents.filter(
      sc => sc.component_id === child.component_id
    ).length;
  }

  // Get total scanned count across all child components
  getTotalScannedCount(item: ScanItem): number {
    return item.scannedChildComponents?.length || 0;
  }

  // Get total required count across all child components
  getTotalRequiredCount(item: ScanItem): number {
    if (!item.childComponents) return 0;
    return item.childComponents.reduce((sum, child) => sum + child.required_quantity, 0);
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
