import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoryService } from '../../../service/category.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-category-management',
  templateUrl: './category-management.component.html',
  styleUrls: ['./category-management.component.scss']
})
export class CategoryManagementComponent implements OnInit {
  categories: any[] = [];
  categoryForm: FormGroup;
  editingCategory: any = null;
  loading = false;
  displayedColumns: string[] = ['name', 'prefix', 'scan_type', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  scanTypes = ['PACKET', 'ITEM', 'BOX'];

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private snackBar: MatSnackBar
  ) {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      prefix: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(10)]],
      scan_type: ['PACKET', Validators.required]
    });
  }

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.loading = true;
    this.categoryService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          this.categories = response.data;
          this.dataSource.data = this.categories;
        }
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('Failed to load categories', 'Close', { duration: 3000 });
      }
    });
  }

  onSubmit() {
    if (this.categoryForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    const formData = this.categoryForm.value;

    if (this.editingCategory) {
      // Update existing category
      this.categoryService.update(this.editingCategory.id, formData).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Category updated successfully', 'Close', { duration: 3000 });
            this.resetForm();
            this.loadCategories();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to update category', 'Close', { duration: 3000 });
        }
      });
    } else {
      // Create new category
      this.categoryService.create(formData).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Category created successfully', 'Close', { duration: 3000 });
            this.resetForm();
            this.loadCategories();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to create category', 'Close', { duration: 3000 });
        }
      });
    }
  }

  editCategory(category: any) {
    this.editingCategory = category;
    this.categoryForm.patchValue({
      name: category.name,
      prefix: category.prefix,
      scan_type: category.scan_type
    });
    // Scroll to form
    document.querySelector('.category-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  deleteCategory(category: any) {
    if (confirm(`Are you sure you want to delete category "${category.name}"?`)) {
      this.loading = true;
      this.categoryService.delete(category.id).subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.snackBar.open('Category deleted successfully', 'Close', { duration: 3000 });
            this.loadCategories();
          }
        },
        error: (err) => {
          this.loading = false;
          this.snackBar.open(err.error?.error || 'Failed to delete category', 'Close', { duration: 3000 });
        }
      });
    }
  }

  resetForm() {
    this.categoryForm.reset({
      name: '',
      prefix: '',
      scan_type: 'PACKET'
    });
    this.editingCategory = null;
  }

  getScanTypeColor(scanType: string): string {
    switch (scanType) {
      case 'PACKET': return 'accent';
      case 'ITEM': return 'primary';
      case 'BOX': return 'warn';
      default: return '';
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.categoryForm.controls).forEach(key => {
      const control = this.categoryForm.get(key);
      control?.markAsTouched();
    });
  }
}
