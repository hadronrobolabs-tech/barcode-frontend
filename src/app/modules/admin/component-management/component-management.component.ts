import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ComponentService } from '../../../service/component.service';
import { CategoryService } from '../../../service/category.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-component-management',
  templateUrl: './component-management.component.html',
  styleUrls: ['./component-management.component.scss']
})
export class ComponentManagementComponent implements OnInit {
  components: any[] = [];
  categories: any[] = [];
  componentForm: FormGroup;
  editingComponent: any = null;
  loading = false;
  displayedColumns: string[] = ['name', 'category', 'type', 'quantity', 'status', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  constructor(
    private fb: FormBuilder,
    private componentService: ComponentService,
    private categoryService: CategoryService,
    private snackBar: MatSnackBar
  ) {
    this.componentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: ['', Validators.required],
      is_packet: [false],
      packet_quantity: [null],
      description: ['']
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
  }

  ngOnInit() {
    this.loadCategories();
    this.loadComponents();
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

  loadComponents() {
    this.loading = true;
    this.componentService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          this.components = response.data;
          this.dataSource.data = this.components;
        }
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('Failed to load components', 'Close', { duration: 3000 });
      }
    });
  }

  onSubmit() {
    if (this.componentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    const formData = {
      ...this.componentForm.value,
      status: 'ACTIVE'
    };

    if (this.editingComponent) {
      // Update existing component
      this.componentService.update(this.editingComponent.id, formData).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Component updated successfully', 'Close', { duration: 3000 });
            this.resetForm();
            this.loadComponents();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to update component', 'Close', { duration: 3000 });
        }
      });
    } else {
      // Create new component
      this.componentService.create(formData).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Component created successfully', 'Close', { duration: 3000 });
            this.resetForm();
            this.loadComponents();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to create component', 'Close', { duration: 3000 });
        }
      });
    }
  }

  editComponent(component: any) {
    this.editingComponent = component;
    this.componentForm.patchValue({
      name: component.name,
      category: component.category,
      is_packet: component.is_packet || false,
      packet_quantity: component.packet_quantity || null,
      description: component.description || ''
    });
    document.querySelector('.component-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  deleteComponent(component: any) {
    if (confirm(`Are you sure you want to delete component "${component.name}"?`)) {
      this.loading = true;
      this.componentService.delete(component.id).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Component deleted successfully', 'Close', { duration: 3000 });
            this.loadComponents();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to delete component', 'Close', { duration: 3000 });
        }
      });
    }
  }

  resetForm() {
    this.componentForm.reset({
      name: '',
      category: '',
      is_packet: false,
      packet_quantity: null,
      description: ''
    });
    this.editingComponent = null;
  }

  private markFormGroupTouched() {
    Object.keys(this.componentForm.controls).forEach(key => {
      const control = this.componentForm.get(key);
      control?.markAsTouched();
    });
  }
}
