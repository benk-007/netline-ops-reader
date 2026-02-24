import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlightDataService } from '../../services/flight-data.service';
import { FlightTask, FlightStatus } from '../../models/flight.model';

@Component({
  selector: 'app-flight-status',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flight-status.component.html',
  styleUrls: ['./flight-status.component.css']
})
export class FlightStatusComponent implements OnInit {
  activeTab: 'route' | 'number' = 'route';

  // Route search
  fromAirport = 'CMN';
  toAirport = 'ORY';
  searchDate = new Date().toISOString().split('T')[0];

  // Flight number search
  airline = 'AT';
  flightNumber = '';

  // Results
  searchResults: FlightTask[] = [];
  selectedFlight: FlightTask | null = null;

  airports = [
    { code: 'CMN', name: 'Casablanca' },
    { code: 'ORY', name: 'Paris Orly' },
    { code: 'CDG', name: 'Paris CDG' },
    { code: 'LHR', name: 'London Heathrow' },
    { code: 'MAD', name: 'Madrid' },
    { code: 'BCN', name: 'Barcelona' },
    { code: 'IST', name: 'Istanbul' },
    { code: 'FCO', name: 'Rome' },
    { code: 'DXB', name: 'Dubai' }
  ];

  constructor(private flightDataService: FlightDataService) { }

  ngOnInit(): void {
    // Auto-search on load
    this.searchFlights();
  }

  setActiveTab(tab: 'route' | 'number'): void {
    this.activeTab = tab;
    this.searchResults = [];
    this.selectedFlight = null;
  }

  searchFlights(): void {
    if (this.activeTab === 'route') {
      this.searchByRoute();
    } else {
      this.searchByNumber();
    }
  }

  searchByRoute(): void {
    const allFlights = this.flightDataService.getFlights();
    this.searchResults = allFlights.filter(flight => {
      const matchOrigin = !this.fromAirport || flight.Origin === this.fromAirport;
      const matchDest = !this.toAirport || flight.Destination === this.toAirport;
      return matchOrigin && matchDest;
    });
  }

  searchByNumber(): void {
    const allFlights = this.flightDataService.getFlights();
    this.searchResults = allFlights.filter(flight => {
      return flight.TaskName.toLowerCase().includes(this.flightNumber.toLowerCase());
    });
  }

  selectFlight(flight: FlightTask): void {
    this.selectedFlight = this.selectedFlight === flight ? null : flight;
  }

  getStatusLabel(status: FlightStatus): string {
    switch (status) {
      case FlightStatus.OnTime: return 'À l\'heure';
      case FlightStatus.MinorDelay: return 'Retard mineur';
      case FlightStatus.CriticalDelay: return 'Retard critique';
      default: return 'Inconnu';
    }
  }

  getStatusClass(status: FlightStatus): string {
    switch (status) {
      case FlightStatus.OnTime: return 'status-on-time';
      case FlightStatus.MinorDelay: return 'status-minor-delay';
      case FlightStatus.CriticalDelay: return 'status-critical-delay';
      default: return '';
    }
  }

  formatTime(date: Date | undefined): string {
    if (!date) return '--:--';
    const d = new Date(date);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '--';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}
