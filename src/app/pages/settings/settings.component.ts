import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  timezone: 'UTC' | 'Local' = 'UTC';
  language: 'fr' | 'en' = 'fr';
  notifications = true;
  autoRefresh = true;
  refreshInterval = 30;

  saveSettings(): void {
    // Save to localStorage
    localStorage.setItem('settings', JSON.stringify({
      timezone: this.timezone,
      language: this.language,
      notifications: this.notifications,
      autoRefresh: this.autoRefresh,
      refreshInterval: this.refreshInterval
    }));

    alert('Settings saved successfully');
  }

  ngOnInit(): void {
    // Load from localStorage
    const saved = localStorage.getItem('settings');
    if (saved) {
      const settings = JSON.parse(saved);
      this.timezone = settings.timezone || 'UTC';
      this.language = settings.language || 'fr';
      this.notifications = settings.notifications !== false;
      this.autoRefresh = settings.autoRefresh !== false;
      this.refreshInterval = settings.refreshInterval || 30;
    }
  }
}
