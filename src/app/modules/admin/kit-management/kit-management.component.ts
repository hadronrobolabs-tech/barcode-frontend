import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { KitService } from '../../../service/kit.service';
import { CategoryService } from '../../../service/category.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';

interface KitComponent {
  category_id: number;
  category_name: string;
  component_id?: number;
  component_name?: string;
  required_quantity: number;
  barcode_prefix?: string;
  is_packet?: boolean;
  packet_quantity?: number;
  description?: string;
}

@Component({
  selector: 'app-kit-management',
  templateUrl: './kit-management.component.html',
  styleUrls: ['./kit-management.component.scss']
})
export class KitManagementComponent implements OnInit {
  kits: any[] = [];
  categories: any[] = [];
  kitForm: FormGroup;
  editingKit: any = null;
  loading = false;
  displayedColumns: string[] = ['kit_name', 'description', 'components_count', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  // Kit Components Management
  selectedKit: any = null;
  kitComponents: KitComponent[] = [];
  componentForm: FormGroup;
  editingComponent: KitComponent | null = null;
  showNewComponentForm = false; // Toggle for new component form
  showEditComponentForm = false; // Toggle for edit component form

  constructor(
    private fb: FormBuilder,
    private kitService: KitService,
    private categoryService: CategoryService,
    private snackBar: MatSnackBar
  ) {
    this.kitForm = this.fb.group({
      kit_name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });

    this.componentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: ['', Validators.required],
      is_packet: [false],
      packet_quantity: [null],
      description: [''],
      required_quantity: [1, [Validators.required, Validators.min(1)]],
      barcode_prefix: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(10)]]
    });

    // Watch is_packet changes
    this.componentForm.get('is_packet')?.valueChanges.subscribe(isPacket => {
      const packetQtyControl = this.componentForm.get('packet_quantity');
      if (isPacket) {
        packetQtyControl?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        packetQtyControl?.clearValidators();
        packetQtyControl?.setValue(null);
      }
      packetQtyControl?.updateValueAndValidity();
    });

    // Transform barcode_prefix to uppercase
    this.componentForm.get('barcode_prefix')?.valueChanges.subscribe(value => {
      if (value && typeof value === 'string') {
        const upperValue = value.toUpperCase();
        if (upperValue !== value) {
          this.componentForm.get('barcode_prefix')?.setValue(upperValue, { emitEvent: false });
        }
      }
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.loadKits();
  }

  loadCategories() {
    this.categoryService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categories = response.data;
        }
      },
      error: (err) => {
        this.snackBar.open('Failed to load categories', 'Close', { duration: 3000 });
      }
    });
  }

  loadKits() {
    this.loading = true;
    this.kitService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          this.kits = response.data;
          this.dataSource.data = this.kits;
        }
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('Failed to load kits', 'Close', { duration: 3000 });
      }
    });
  }

  onSubmit() {
    if (this.kitForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    const formData = this.kitForm.value;

    if (this.editingKit) {
      // Update existing kit
      this.kitService.update(this.editingKit.id, formData).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Kit updated successfully', 'Close', { duration: 3000 });
            this.resetForm();
            this.loadKits();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to update kit', 'Close', { duration: 3000 });
        }
      });
    } else {
      // Create new kit
      this.kitService.create(formData).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Kit created successfully', 'Close', { duration: 3000 });
            this.resetForm();
            this.loadKits();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to create kit', 'Close', { duration: 3000 });
        }
      });
    }
  }

  editKit(kit: any) {
    this.editingKit = kit;
    this.kitForm.patchValue({
      kit_name: kit.kit_name,
      description: kit.description || ''
    });
    document.querySelector('.kit-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  deleteKit(kit: any) {
    if (confirm(`Are you sure you want to delete kit "${kit.kit_name}"? This will also remove all associated components.`)) {
      this.loading = true;
      this.kitService.delete(kit.id).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Kit deleted successfully', 'Close', { duration: 3000 });
            this.loadKits();
            if (this.selectedKit?.id === kit.id) {
              this.selectedKit = null;
              this.kitComponents = [];
            }
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to delete kit', 'Close', { duration: 3000 });
        }
      });
    }
  }

  selectKitForComponents(kit: any) {
    this.selectedKit = kit;
    this.loadKitComponents();
  }

  loadKitComponents() {
    if (!this.selectedKit) return;

    this.loading = true;
    this.kitService.getById(this.selectedKit.id).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          this.kitComponents = (response.data.components || []).map((comp: any) => ({
            category_id: comp.category_id,
            category_name: comp.category_name,
            component_id: comp.component_id,
            component_name: comp.component_name,
            required_quantity: comp.required_quantity,
            barcode_prefix: comp.barcode_prefix || '',
            is_packet: comp.is_packet || false,
            packet_quantity: comp.packet_quantity || null,
            description: comp.description || ''
          }));
        }
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('Failed to load kit components', 'Close', { duration: 3000 });
      }
    });
  }

  addComponentToKit() {
    if (this.componentForm.invalid || !this.selectedKit) {
      this.markComponentFormTouched();
      return;
    }

    this.loading = true;
    const formData = this.componentForm.value;

    // Prepare component data for backend
    const componentData = {
      name: formData.name,
      category: formData.category,
      is_packet: formData.is_packet || false,
      packet_quantity: formData.packet_quantity || null,
      description: formData.description || null
    };

    this.kitService.addComponent({
      kit_id: this.selectedKit.id,
      component: componentData,
      required_quantity: formData.required_quantity,
      barcode_prefix: formData.barcode_prefix
    }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.snackBar.open('Component created and added to kit successfully', 'Close', { duration: 3000 });
          this.resetComponentForm();
          this.loadKitComponents();
        }
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.error || 'Failed to add component to kit', 'Close', { duration: 3000 });
      }
    });
  }

  resetComponentForm() {
    this.componentForm.reset({
      name: '',
      category: '',
      is_packet: false,
      packet_quantity: null,
      description: '',
      required_quantity: 1,
      barcode_prefix: ''
    });
    this.showNewComponentForm = false;
    this.showEditComponentForm = false;
    this.editingComponent = null;
  }

  toggleNewComponentForm() {
    this.showNewComponentForm = !this.showNewComponentForm;
    if (!this.showNewComponentForm) {
      this.resetComponentForm();
    }
  }

  updateKitComponent(comp: KitComponent) {
    if (!this.selectedKit) return;

    this.loading = true;
    this.kitService.updateComponent({
      kit_id: this.selectedKit.id,
      category_id: comp.category_id,
      required_quantity: comp.required_quantity
    }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.snackBar.open('Component updated successfully', 'Close', { duration: 3000 });
          this.loadKitComponents();
        }
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.error || 'Failed to update component', 'Close', { duration: 3000 });
      }
    });
  }

  editComponent(comp: KitComponent) {
    if (!this.selectedKit || !comp.component_id) return;
    
    this.editingComponent = comp;
    this.showEditComponentForm = true;
    this.showNewComponentForm = false;
    
    // Populate form with component data
    this.componentForm.patchValue({
      name: comp.component_name || '',
      category: comp.category_name || '',
      is_packet: comp.is_packet || false,
      packet_quantity: comp.packet_quantity || null,
      description: comp.description || '',
      required_quantity: comp.required_quantity || 1,
      barcode_prefix: comp.barcode_prefix || ''
    });
    
    document.querySelector('.component-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  updateComponent() {
    if (this.componentForm.invalid || !this.selectedKit || !this.editingComponent?.component_id) {
      this.markComponentFormTouched();
      return;
    }

    this.loading = true;
    const formData = this.componentForm.value;

    const componentData = {
      name: formData.name,
      category: formData.category,
      is_packet: formData.is_packet || false,
      packet_quantity: formData.packet_quantity || null,
      description: formData.description || null
    };

    this.kitService.updateComponentDetails({
      kit_id: this.selectedKit.id,
      component_id: this.editingComponent.component_id,
      component: componentData,
      required_quantity: formData.required_quantity,
      barcode_prefix: formData.barcode_prefix
    }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.snackBar.open('Component updated successfully', 'Close', { duration: 3000 });
          this.resetComponentForm();
          this.loadKitComponents();
        }
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.error || 'Failed to update component', 'Close', { duration: 3000 });
      }
    });
  }

  deleteComponent(comp: KitComponent) {
    if (!this.selectedKit || !comp.component_id) return;

    const componentName = comp.component_name || comp.category_name;
    
    // Ask user what they want to do
    const action = confirm(
      `Delete "${componentName}"?\n\n` +
      `OK = Delete component entirely (removes from kit and deletes component from database)\n` +
      `Cancel = Only remove from this kit (keeps component in database)`
    );
    
    if (action) {
      // User wants to delete entirely
      const confirmDelete = confirm(
        `Are you sure you want to permanently delete "${componentName}"?\n\n` +
        `This will:\n` +
        `- Remove it from this kit\n` +
        `- Delete the component from the database\n` +
        `- This action cannot be undone!`
      );
      
      if (!confirmDelete) return;
      
      this.loading = true;
      this.kitService.deleteComponent({
        kit_id: this.selectedKit.id,
        component_id: comp.component_id,
        delete_component: true
      }).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Component deleted successfully', 'Close', { duration: 3000 });
            this.loadKitComponents();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to delete component', 'Close', { duration: 3000 });
        }
      });
    } else {
      // User wants to only remove from kit
      const confirmRemove = confirm(`Remove "${componentName}" from this kit?`);
      if (!confirmRemove) return;
      
      this.loading = true;
      this.kitService.deleteComponent({
        kit_id: this.selectedKit.id,
        component_id: comp.component_id,
        delete_component: false
      }).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Component removed from kit', 'Close', { duration: 3000 });
            this.loadKitComponents();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to remove component', 'Close', { duration: 3000 });
        }
      });
    }
  }

  removeKitComponent(comp: KitComponent) {
    if (!this.selectedKit) return;

    const componentName = comp.component_name || comp.category_name;
    if (confirm(`Remove "${componentName}" from this kit?`)) {
      this.loading = true;
      this.kitService.removeComponent({
        kit_id: this.selectedKit.id,
        category_id: comp.category_id,
        component_id: comp.component_id
      }).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Component removed from kit', 'Close', { duration: 3000 });
            this.loadKitComponents();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to remove component', 'Close', { duration: 3000 });
        }
      });
    }
  }

  resetForm() {
    this.kitForm.reset({
      kit_name: '',
      description: ''
    });
    this.editingKit = null;
  }

  private markFormGroupTouched() {
    Object.keys(this.kitForm.controls).forEach(key => {
      const control = this.kitForm.get(key);
      control?.markAsTouched();
    });
  }

  private markComponentFormTouched() {
    Object.keys(this.componentForm.controls).forEach(key => {
      const control = this.componentForm.get(key);
      control?.markAsTouched();
    });
  }
}
