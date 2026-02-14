import { Component, OnInit } from '@angular/core';
import { KitService } from '../../service/kit.service';
import { BarcodeService } from '../../service/barcode.service';
import { AuthService } from '../../service/auth.service';
import { QzTrayService } from '../../service/qz-tray.service';

interface SelectedComponent {
  id: number;
  name: string;
  category: string;
  category_name: string;
  selected: boolean;
}

interface ComponentOption {
  id: number;
  name: string;
  category_name: string;
  parent_component_id?: number | null;
  display_label?: string;
  level?: number;
}

@Component({
  selector: 'app-generate-barcode',
  templateUrl: './generate-qr.component.html',
  styleUrls: ['./generate-qr.component.scss']
})
export class GenerateBarcodeComponent implements OnInit {
  kits: any[] = [];
  kitComponents: any[] = [];
  selectedKitId: number | null = null;
  selectedKitName: string = '';
  selectedComponents: SelectedComponent[] = [];
  componentOptions: ComponentOption[] = []; // For dropdown
  selectedComponentId: number | null = null; // Selected component from dropdown
  componentQuantity: number = 1; // Quantity for selected component
  loading = false;
  errorMessage = '';
  successMessage = '';
  generatedBarcodes: any[] = [];
  generateBoxBarcode = false;
  boxBarcodeQuantity: number = 1;
  
  // Barcode lookup for box code PDF
  barcodeListInput: string = '';
  showBarcodeLookup: boolean = false;

  // QZ Tray: printer list and selected printer (for Direct Print)
  availablePrinters: string[] = [];
  selectedPrinterName: string | null = null;
  loadingPrinters = false;

  constructor(
    private kitService: KitService,
    private barcodeService: BarcodeService,
    private authService: AuthService,
    private qzTrayService: QzTrayService
  ) {}

  ngOnInit() {
    this.loadKits();
  }

  loadKits() {
    this.kitService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.kits = response.data;
        }
      },
      error: (err) => {
        this.errorMessage = 'Failed to load kits';
      }
    });
  }

  onKitSelect() {
    if (!this.selectedKitId) {
      this.kitComponents = [];
      this.selectedComponents = [];
      this.componentOptions = [];
      this.selectedComponentId = null;
      this.selectedKitName = '';
      this.errorMessage = '';
      this.generateBoxBarcode = false; // Reset box barcode when kit changes
      return;
    }

    const selectedKit = this.kits.find(k => k.id === this.selectedKitId);
    this.selectedKitName = selectedKit ? (selectedKit.kit_name || selectedKit.name) : '';

    this.loading = true;
    this.errorMessage = '';
    this.kitService.getComponentsForKit(this.selectedKitId).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data && response.data.length > 0) {
          // Map components for dropdown (flat with parent_component_id, display_label)
          this.kitComponents = response.data;
          this.componentOptions = response.data.map((comp: any) => ({
            id: comp.id || comp.component_id,
            name: comp.name || comp.component_name,
            category_name: comp.category_name || comp.category_prefix || comp.category,
            parent_component_id: comp.parent_component_id ?? null,
            display_label: comp.display_label || comp.name || comp.component_name,
            level: comp.level
          }));
          this.selectedComponents = response.data.map((comp: any) => ({
            id: comp.id,
            name: comp.name || comp.component_name,
            category: comp.category || comp.category_name,
            category_name: comp.category_name || comp.category_prefix || comp.category,
            selected: false
          }));
        } else {
          this.errorMessage = 'No components found for this kit. Please add components to the kit first.';
          this.componentOptions = [];
          this.selectedComponents = [];
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to load kit components';
        this.componentOptions = [];
        this.selectedComponents = [];
      }
    });
  }

  onBoxBarcodeToggle() {
    // If box barcode is enabled, clear component selection
    if (this.generateBoxBarcode) {
      this.selectedComponentId = null;
      this.componentQuantity = 1;
    }
  }

  onComponentSelect() {
    // If component is selected, disable box barcode
    if (this.selectedComponentId) {
      this.generateBoxBarcode = false;
    }
  }

  getSelectedCount(): number {
    return this.selectedComponentId ? 1 : 0;
  }

  getTotalBarcodeCount(): number {
    if (this.generateBoxBarcode) {
      return this.boxBarcodeQuantity;
    } else if (this.selectedComponentId) {
      return this.componentQuantity;
    }
    return 0;
  }

  generateBarcodes() {
    // Validation: Only one type at a time
    if (!this.selectedKitId) {
      this.errorMessage = 'Please select a kit';
      return;
    }

    if (!this.selectedComponentId && !this.generateBoxBarcode) {
      this.errorMessage = 'Please select a component or enable box barcode generation';
      return;
    }

    if (this.selectedComponentId && this.generateBoxBarcode) {
      this.errorMessage = 'Please select either component barcode OR box barcode, not both';
      return;
    }

    // Validate component selection
    if (this.selectedComponentId) {
      if (!this.componentQuantity || this.componentQuantity < 1) {
        this.errorMessage = 'Please enter a valid quantity (minimum 1) for component';
        return;
      }
    }

    // Validate box barcode
    if (this.generateBoxBarcode) {
      if (!this.boxBarcodeQuantity || this.boxBarcodeQuantity < 1) {
        this.errorMessage = 'Please enter valid box barcode quantity';
        return;
      }
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.generatedBarcodes = [];

    const user = this.authService.getUser();
    const userId = user?.id || null;

    let allBarcodes: any[] = [];
    let completed = 0;
    let failed = 0;
    const totalRequests = this.generateBoxBarcode ? this.boxBarcodeQuantity : this.componentQuantity;

    // Generate component barcodes OR box barcodes (only one type)
    if (this.selectedComponentId && !this.generateBoxBarcode) {
      // Generate component barcodes
      for (let i = 0; i < this.componentQuantity; i++) {
        const selectedOpt = this.componentOptions.find(o => o.id === this.selectedComponentId);
        this.barcodeService.generate({
          product_id: this.selectedKitId!,
          component_id: this.selectedComponentId!,
          parent_component_id: selectedOpt?.parent_component_id ?? null,
          quantity: 1,
          user_id: userId,
          object_type: 'COMPONENT'
        }).subscribe({
          next: (response) => {
            completed++;
            if (response && (response.success || response.barcodes)) {
              const barcodes = response.barcodes || [];
              allBarcodes.push(...barcodes);
            }
            this.checkGenerationComplete(completed, failed, totalRequests, allBarcodes);
          },
          error: (err) => {
            completed++;
            failed++;
            this.checkGenerationComplete(completed, failed, totalRequests, allBarcodes);
          }
        });
      }
    } else if (this.generateBoxBarcode && !this.selectedComponentId) {
      // Generate box barcodes
      for (let i = 0; i < this.boxBarcodeQuantity; i++) {
        this.barcodeService.generate({
          product_id: this.selectedKitId!,
          component_id: null,
          quantity: 1,
          user_id: userId,
          object_type: 'BOX'
        }).subscribe({
          next: (response) => {
            completed++;
            if (response && (response.success || response.barcodes)) {
              const barcodes = response.barcodes || [];
              allBarcodes.push(...barcodes);
            }
            this.checkGenerationComplete(completed, failed, totalRequests, allBarcodes);
          },
          error: (err) => {
            completed++;
            failed++;
            this.checkGenerationComplete(completed, failed, totalRequests, allBarcodes);
          }
        });
      }
    }
  }

  private checkGenerationComplete(completed: number, failed: number, total: number, allBarcodes: any[]) {
    if (completed === total) {
      this.loading = false;
      this.generatedBarcodes = allBarcodes;
      if (failed === 0) {
        this.successMessage = `Successfully generated ${allBarcodes.length} barcode(s)!`;
      } else {
        this.successMessage = `Generated ${allBarcodes.length} barcode(s). ${failed} failed.`;
      }
    }
  }

  // TSPL Raw Printing (Main method - Direct to printer)
  // Print TSPL - For user's laptop printer (downloads TSPL file)
  printTSPL() {
    if (this.generatedBarcodes.length === 0) {
      this.errorMessage = 'No barcodes generated yet';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const user = this.authService.getUser();
    const userId = user?.id || null;

    this.barcodeService.printTSPL({
      barcodes: this.generatedBarcodes.map(b => b.barcode_value || b),
      user_id: userId,
      number_of_prints: "1"   // Can be made configurable
    }).subscribe({
      next: (response) => {
        this.loading = false;
        
        // Always download TSPL file for user's laptop printing
        if (response.tsplCommands) {
          this.downloadTSPLFile(response.tsplCommands);
          this.successMessage = `✅ TSPL file downloaded! Open it with your printer software to print on your laptop printer.`;
          this.errorMessage = '';
        } else {
          this.errorMessage = `⚠️ TSPL commands not generated. Please try again.`;
        }
      },
      error: (err: any) => {
        this.loading = false;
        
        // Even on error, try to download TSPL file if available
        if (err.error?.tsplCommands) {
          this.downloadTSPLFile(err.error.tsplCommands);
          this.successMessage = `✅ TSPL file downloaded! Open it with your printer software to print on your laptop printer.`;
          this.errorMessage = '';
        } else {
          this.errorMessage = err.error?.error || 'Failed to generate TSPL commands';
        }
      }
    });
  }

  // Download TSPL file for user's laptop printing
  downloadTSPLFile(tsplCommands: string) {
    try {
      // Create blob from TSPL commands
      const blob = new Blob([tsplCommands], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `barcode_labels_${new Date().getTime()}.tspl`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ TSPL file downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading TSPL file:', error);
      this.errorMessage = 'Failed to download TSPL file. Check console for TSPL commands.';
    }
  }

  // Load printers from QZ Tray (for Direct Print dropdown)
  async loadPrinters() {
    if (!this.qzTrayService.isQzTrayAvailable()) {
      this.errorMessage = 'QZ Tray is not available. Install from https://qz.io and ensure it is running.';
      return;
    }
    this.loadingPrinters = true;
    this.errorMessage = '';
    try {
      const printers = await this.qzTrayService.findPrinters();
      this.availablePrinters = printers || [];
      if (this.availablePrinters.length > 0 && !this.selectedPrinterName) {
        this.selectedPrinterName = this.availablePrinters[0];
      }
    } catch (e: any) {
      this.errorMessage = e?.message || 'Failed to load printers';
    } finally {
      this.loadingPrinters = false;
    }
  }

  // Direct Print via QZ Tray (Step 4-6: Get TSPL from backend → Send to QZ Tray → Print)
  async directPrint() {
    if (this.generatedBarcodes.length === 0) {
      this.errorMessage = 'No barcodes generated yet';
      return;
    }

    // Check if QZ Tray is available
    if (!this.qzTrayService.isQzTrayAvailable()) {
      this.errorMessage = 'QZ Tray is not available. Please install QZ Tray from https://qz.io and make sure it is running.';
      return;
    }

    // If no printer list yet, load it so user can select (or use first)
    if (this.availablePrinters.length === 0) {
      await this.loadPrinters();
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    const user = this.authService.getUser();
    const userId = user?.id || null;
    const printerToUse = this.selectedPrinterName || undefined;

    try {
      // Step 4: Call backend API to get TSPL commands
      this.barcodeService.printTSPL({
        barcodes: this.generatedBarcodes.map(b => b.barcode_value || b),
        user_id: userId,
        number_of_prints: "1"
      }).subscribe({
        next: async (response) => {
          try {
            // Get TSPL commands from response
            const tsplCommands = response.tsplCommands || (response as any).tsplCommands;
            
            if (!tsplCommands || tsplCommands.trim().length === 0) {
              this.loading = false;
              this.errorMessage = '⚠️ TSPL commands not generated. Please try again.';
              return;
            }

            console.log('✅ TSPL commands received from backend');
            console.log(`📄 TSPL length: ${tsplCommands.length} characters`);

            // Step 5 & 6: Send TSPL to selected printer via QZ Tray
            await this.qzTrayService.printTSPL(tsplCommands, printerToUse);
            
            this.loading = false;
            this.successMessage = '✅ Labels printed successfully via QZ Tray!';
            this.errorMessage = '';
            
            // Clear success message after 3 seconds
            setTimeout(() => {
              this.successMessage = '';
            }, 3000);
          } catch (printError: any) {
            this.loading = false;
            console.error('❌ QZ Tray printing error:', printError);
            
            // User-friendly error messages
            if (printError.message && printError.message.includes('not running')) {
              this.errorMessage = 'QZ Tray is not running. Please start QZ Tray application.';
            } else if (printError.message && printError.message.includes('Permission denied')) {
              this.errorMessage = 'Permission denied. Please click "Allow" in QZ Tray when prompted.';
            } else if (printError.message && printError.message.includes('No printer found')) {
              this.errorMessage = 'No printer found. Please connect a printer to your computer.';
            } else {
              this.errorMessage = `Printing failed: ${printError.message || printError}`;
            }
          }
        },
        error: async (err: any) => {
          // Try to get TSPL from error response (in case backend returns error but still has TSPL)
          const tsplCommands = err.error?.tsplCommands;
          
          if (tsplCommands && tsplCommands.trim().length > 0) {
            try {
              console.log('⚠️ Got TSPL from error response, attempting to print...');
              await this.qzTrayService.printTSPL(tsplCommands, printerToUse);
              this.loading = false;
              this.successMessage = '✅ Labels printed successfully via QZ Tray!';
              this.errorMessage = '';
              setTimeout(() => {
                this.successMessage = '';
              }, 3000);
              return;
            } catch (printError: any) {
              this.loading = false;
              this.errorMessage = `Printing failed: ${printError.message || printError}`;
              return;
            }
          }
          
          this.loading = false;
          this.errorMessage = err.error?.error || 'Failed to generate TSPL commands';
        }
      });
    } catch (error: any) {
      this.loading = false;
      console.error('❌ Direct print error:', error);
      this.errorMessage = `Direct print failed: ${error.message || error}`;
    }
  }

  // Legacy PDF download (backward compatibility)
  downloadPdf() {
    if (this.generatedBarcodes.length === 0) {
      this.errorMessage = 'No barcodes generated yet';
      return;
    }

    this.loading = true;
    const user = this.authService.getUser();
    const userId = user?.id || null;

    this.barcodeService.downloadPdf({
      barcodes: this.generatedBarcodes.map(b => b.barcode_value || b),
      user_id: userId
    }).subscribe({
      next: (blob) => {
        this.loading = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `barcode-labels-${this.selectedKitName || 'kit'}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.successMessage = 'PDF downloaded successfully!';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to download PDF';
      }
    });
  }

  reset() {
    this.selectedKitId = null;
    this.selectedKitName = '';
    this.kitComponents = [];
    this.selectedComponents = [];
    this.componentOptions = [];
    this.selectedComponentId = null;
    this.componentQuantity = 1;
    this.generatedBarcodes = [];
    this.generateBoxBarcode = false;
    this.boxBarcodeQuantity = 1;
    this.barcodeListInput = '';
    this.showBarcodeLookup = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Download box code PDF for provided barcode list
  downloadBoxCodePdf() {
    if (!this.barcodeListInput.trim()) {
      this.errorMessage = 'Please enter barcode list';
      return;
    }

    // Parse barcode list (comma or newline separated)
    const barcodes = this.barcodeListInput
      .split(/[,\n]/)
      .map(b => b.trim())
      .filter(b => b.length > 0);

    if (barcodes.length === 0) {
      this.errorMessage = 'Please enter at least one barcode';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const user = this.authService.getUser();
    const userId = user?.id || null;

    this.barcodeService.lookupBarcodesForBoxCode({
      barcodes: barcodes,
      user_id: userId
    }).subscribe({
      next: (blob: Blob) => {
        this.loading = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `box_codes_${new Date().getTime()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.successMessage = `Box code PDF downloaded successfully for ${barcodes.length} barcode(s)!`;
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to generate box code PDF. Please check if all barcodes are valid.';
      }
    });
  }
}

