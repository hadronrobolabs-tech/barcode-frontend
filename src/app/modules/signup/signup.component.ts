import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../service/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {

  signupForm: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;
  loading = false;
  errorMessage = '';
  passwordStrength = 0;
  passwordStrengthLabel = '';
  passwordStrengthColor = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Redirect to dashboard if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }

    this.signupForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      password: ['', [Validators.required, Validators.minLength(6), this.passwordValidator]],
      confirmPassword: ['', Validators.required],
      role: ['WORKER', Validators.required],
      adminCode: ['']
    }, { validators: this.matchPassword });
  }

  ngOnInit() {
    // Watch password changes for strength indicator
    this.signupForm.get('password')?.valueChanges.subscribe(() => {
      this.checkPasswordStrength();
    });
  }

  passwordValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = control.value;
    if (!value) return null;

    const hasNumber = /[0-9]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const valid = hasNumber && hasUpper && hasLower && hasSpecial && value.length >= 8;
    return valid ? null : { weakPassword: true };
  }

  checkPasswordStrength() {
    const password = this.signupForm.get('password')?.value || '';
    let strength = 0;

    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    this.passwordStrength = strength;

    if (strength <= 2) {
      this.passwordStrengthLabel = 'Weak';
      this.passwordStrengthColor = '#f44336';
    } else if (strength === 3) {
      this.passwordStrengthLabel = 'Fair';
      this.passwordStrengthColor = '#ff9800';
    } else if (strength === 4) {
      this.passwordStrengthLabel = 'Good';
      this.passwordStrengthColor = '#2196f3';
    } else {
      this.passwordStrengthLabel = 'Strong';
      this.passwordStrengthColor = '#4caf50';
    }
  }

  matchPassword(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onRegister(): void {
    if (this.signupForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    // Validate admin code if trying to register as ADMIN
    const selectedRole = this.signupForm.value.role;
    if (selectedRole === 'ADMIN') {
      const adminCode = this.signupForm.value.adminCode;
      if (!adminCode || adminCode !== 'ADMIN2024') {
        this.errorMessage = 'Invalid admin code. Please contact system administrator.';
        return;
      }
    }

    this.loading = true;
    this.errorMessage = '';

    const payload = {
      fullName: this.signupForm.value.fullName,
      email: this.signupForm.value.email,
      phone: this.signupForm.value.phone,
      password: this.signupForm.value.password,
      role: selectedRole
    };

    this.authService.register(payload).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          // Show success message and redirect to login
          this.router.navigate(['/login'], { 
            queryParams: { registered: 'true' } 
          });
        }
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err.error?.error || err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }

  private markFormGroupTouched() {
    Object.keys(this.signupForm.controls).forEach(key => {
      const control = this.signupForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.signupForm.get(fieldName);
    if (control?.hasError('required') && control?.touched) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control?.hasError('email') && control?.touched) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('minlength') && control?.touched) {
      if (fieldName === 'fullName') {
        return 'Name must be at least 2 characters';
      }
      return 'Password must be at least 6 characters';
    }
    if (control?.hasError('pattern') && control?.touched) {
      if (fieldName === 'phone') {
        return 'Phone must be exactly 10 digits';
      }
      if (fieldName === 'fullName') {
        return 'Name can only contain letters and spaces';
      }
    }
    if (control?.hasError('weakPassword') && control?.touched) {
      return 'Password must contain uppercase, lowercase, number, and special character';
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'fullName': 'Full Name',
      'email': 'Email',
      'phone': 'Phone Number',
      'password': 'Password',
      'confirmPassword': 'Confirm Password'
    };
    return labels[fieldName] || fieldName;
  }

  // Helper methods for template
  checkLength(value: string): boolean {
    return (value || '').length >= 6;
  }

  checkCase(value: string): boolean {
    return /[a-z]/.test(value || '') && /[A-Z]/.test(value || '');
  }

  checkNumber(value: string): boolean {
    return /[0-9]/.test(value || '');
  }

  checkSpecialChar(value: string): boolean {
    return /[!@#$%^&*(),.?":{}|<>]/.test(value || '');
  }

  onRoleChange() {
    const role = this.signupForm.get('role')?.value;
    const adminCodeControl = this.signupForm.get('adminCode');
    
    if (role === 'ADMIN') {
      adminCodeControl?.setValidators([Validators.required]);
    } else {
      adminCodeControl?.clearValidators();
      adminCodeControl?.setValue('');
    }
    adminCodeControl?.updateValueAndValidity();
  }
}
