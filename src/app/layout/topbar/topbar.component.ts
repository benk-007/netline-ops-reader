import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule, User, ChevronDown } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent {
  readonly User = User;
  readonly ChevronDown = ChevronDown;

  showDropdown = false;
  currentUser$ = this.authService.currentUser;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  navigateToProfile(): void {
    this.showDropdown = false;
    // Navigate to profile page (not implemented yet)
  }

  navigateToSettings(): void {
    this.showDropdown = false;
    this.router.navigate(['/settings']);
  }

  logout(): void {
    this.showDropdown = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
