import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

export type UserRole = 'CCO' | 'STATION';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  matricule = '';
  password = '';
  selectedRole: UserRole = 'CCO';
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  roles: { value: UserRole; label: string; sublabel: string; icon: string }[] = [
    { value: 'CCO', label: 'CCO', sublabel: 'Operations Control', icon: 'monitor' },
    { value: 'STATION', label: 'Station Manager', sublabel: 'Chef d\'Escale', icon: 'map-pin' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (!this.matricule || !this.password) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.matricule, this.password).subscribe({
      next: (success) => {
        if (success) {
          const user = {
            matricule: this.matricule,
            name: `User ${this.matricule}`,
            role: this.selectedRole
          };
          this.authService.completeLogin(user);
          localStorage.setItem('userRole', this.selectedRole);

          // Route based on role
          if (this.selectedRole === 'STATION') {
            this.router.navigate(['/station']);
          } else {
            this.router.navigate(['/gantt']);
          }
        } else {
          this.errorMessage = 'Invalid credentials';
          this.isLoading = false;
        }
      },
      error: () => {
        this.errorMessage = 'An error occurred. Please try again.';
        this.isLoading = false;
      }
    });
  }
}
