import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import * as L from 'leaflet';

// ── Types ──────────────────────────────────────────────────────────────────
interface InboundFlight {
  id: string;
  flightNo: string;
  aircraft: string;
  origin: string;
  destination: string;
  status: 'OnTime' | 'Delayed' | 'Scheduled';
  delayMin: number;
  gate: string;
  pax: number;
  maxPax: number;
  baggage: number;
  etaTime: string;
  landingInMin: number;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-station-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './station-dashboard.component.html',
  styleUrls: ['./station-dashboard.component.css']
})
export class StationDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  private map!: L.Map;
  public currentTime: string = '';
  private clockInterval: any;
  public selectedFlight: InboundFlight | null = null;
  public isProfileMenuOpen = false;

  // ORY coordinates
  private ORY_LAT = 48.7233;
  private ORY_LNG = 2.3794;

  public flights: InboundFlight[] = [
    {
      id: 'AT210', flightNo: 'AT210', aircraft: 'B737-800',
      origin: 'CMN', destination: 'ORY',
      status: 'OnTime', delayMin: 0, gate: 'G12',
      pax: 152, maxPax: 160, baggage: 980, etaTime: '14:35',
      landingInMin: 10,
      lat: 44.5, lng: -1.5
    },
    {
      id: 'AT780', flightNo: 'AT780', aircraft: 'B737-800',
      origin: 'CMN', destination: 'ORY',
      status: 'Delayed', delayMin: 15, gate: 'D08',
      pax: 145, maxPax: 160, baggage: 1200, etaTime: '14:45',
      landingInMin: 32,
      lat: 40.7, lng: -3.7
    },
    {
      id: 'AT502', flightNo: 'AT502', aircraft: 'B737-MAX',
      origin: 'AGA', destination: 'ORY',
      status: 'Scheduled', delayMin: 0, gate: 'F04',
      pax: 98, maxPax: 178, baggage: 750, etaTime: '15:47',
      landingInMin: 75,
      lat: 37.2, lng: -7.2
    }
  ];

  // Computed
  get onTimeCount(): number { return this.flights.filter(f => f.status === 'OnTime').length; }
  get delayedCount(): number { return this.flights.filter(f => f.status === 'Delayed').length; }
  get scheduledCount(): number { return this.flights.filter(f => f.status === 'Scheduled').length; }

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  ngAfterViewInit(): void {
    // Defer until the DOM element has painted and has real dimensions
    setTimeout(() => {
      this.initMap();
      // Force Leaflet to recalculate container size and redraw all tiles
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 0);
  }

  ngOnDestroy(): void {
    clearInterval(this.clockInterval);
    if (this.map) this.map.remove();
  }

  private updateClock(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
  }

  // ── Map Init ──────────────────────────────────────────────────────────────
  private initMap(): void {
    this.map = L.map('station-map', {
      center: [this.ORY_LAT, this.ORY_LNG],
      zoom: 6,
      zoomControl: false
    });

    // Clean minimal tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '©OpenStreetMap ©CARTO',
      maxZoom: 19
    }).addTo(this.map);

    // Zoom control bottom-left
    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    // Airport marker
    this.addAirportMarker();

    // Flight markers + trajectory lines
    this.flights.forEach(flight => this.addFlightMarker(flight));
  }

  private addAirportMarker(): void {
    const airportIcon = L.divIcon({
      className: '',
      html: `<div class="airport-marker"><div class="airport-pulse"></div><div class="airport-dot"></div></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    L.marker([this.ORY_LAT, this.ORY_LNG], { icon: airportIcon })
      .addTo(this.map)
      .bindTooltip('<b>Paris Orly (ORY)</b>', { permanent: true, direction: 'right', className: 'airport-tooltip' });
  }

  private addFlightMarker(flight: InboundFlight): void {
    const color = this.getStatusColor(flight.status);

    // Dashed trajectory line to ORY
    const polyline = L.polyline(
      [[flight.lat, flight.lng], [this.ORY_LAT, this.ORY_LNG]],
      { color, weight: 1.5, dashArray: '6 5', opacity: 0.65 }
    ).addTo(this.map);

    // Plane marker
    const planeIcon = L.divIcon({
      className: '',
      html: `
        <div class="plane-marker" style="--status-color:${color}">
          <svg viewBox="0 0 24 24" fill="${color}" width="22" height="22">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <div class="plane-label">${flight.flightNo}</div>
        </div>`,
      iconSize: [36, 48],
      iconAnchor: [18, 14]
    });

    const marker = L.marker([flight.lat, flight.lng], { icon: planeIcon })
      .addTo(this.map);

    // Custom popup
    marker.bindPopup(this.buildPopupHtml(flight), {
      maxWidth: 340,
      minWidth: 320,
      className: 'flight-popup',
      closeButton: true,
      autoPan: true
    });

    marker.on('click', () => {
      this.selectedFlight = flight;
      marker.openPopup();
    });

    // Wire "View Turnaround" button after popup opens
    marker.on('popupopen', () => {
      const btn = document.getElementById(`btn-turnaround-${flight.id}`);
      if (btn) btn.addEventListener('click', () => this.viewTurnaround(flight));
    });
  }

  private buildPopupHtml(f: InboundFlight): string {
    const color = this.getStatusColor(f.status);
    const statusLabel = f.status === 'Delayed'
      ? `<span class="pop-badge delayed">⚠ Delayed +${f.delayMin}m</span>`
      : f.status === 'OnTime'
        ? `<span class="pop-badge ontime">✓ On Time</span>`
        : `<span class="pop-badge scheduled">◷ Scheduled</span>`;

    const occupancy = Math.round((f.pax / f.maxPax) * 100);
    const barColor = occupancy > 85 ? '#D71920' : '#27AE60';

    return `
      <div class="pop-card">
        <div class="pop-header">
          <div class="pop-flight-info">
            <span class="pop-fno">${f.flightNo}</span>
            <span class="pop-aircraft">${f.aircraft}</span>
            <span class="pop-live" style="background:${color}">LIVE</span>
          </div>
          <span class="pop-route">${f.origin} ➔ ${f.destination}</span>
        </div>

        <div class="pop-status-row">
          ${statusLabel}
          <span class="pop-landing">Landing in ${f.landingInMin}m</span>
        </div>

        <div class="pop-times">
          <div class="pop-time-block">
            <p class="pop-time-lbl">ETA (ESTIMATED)</p>
            <p class="pop-time-val">${f.etaTime}</p>
          </div>
          <div class="pop-time-block">
            <p class="pop-time-lbl">ATA (ACTUAL)</p>
            <p class="pop-time-val">--:--</p>
          </div>
        </div>

        <div class="pop-load-grid">
          <div class="pop-load-item">
            <p class="pop-load-lbl">PAX LOAD</p>
            <p class="pop-load-val">${f.pax} / ${f.maxPax} <span>seats</span></p>
          </div>
          <div class="pop-load-item">
            <p class="pop-load-lbl">BAGGAGE</p>
            <p class="pop-load-val">${f.baggage.toLocaleString()} <span>kg</span></p>
          </div>
        </div>

        <div class="pop-occupancy">
          <div class="pop-occ-label">
            <span>Seat occupancy</span><span>${occupancy}%</span>
          </div>
          <div class="pop-occ-bar">
            <div class="pop-occ-fill" style="width:${occupancy}%; background:${barColor}"></div>
          </div>
        </div>

        <div class="pop-footer">
          <div class="pop-gate">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            GATE <strong>${f.gate}</strong>
          </div>
          <button id="btn-turnaround-${f.id}" class="pop-btn">
            View Turnaround →
          </button>
        </div>
      </div>`;
  }

  // ── Public actions ────────────────────────────────────────────────────────
  public viewTurnaround(flight: InboundFlight): void {
    alert(`Turnaround view for ${flight.flightNo} is not yet implemented.`);
  }

  public selectFlight(flight: InboundFlight): void {
    this.selectedFlight = flight;
    this.map.flyTo([flight.lat, flight.lng], 7, { duration: 1.2 });
  }

  public toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  public logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  public getStatusColor(status: string): string {
    switch (status) {
      case 'OnTime': return '#27AE60';
      case 'Delayed': return '#D71920';
      case 'Scheduled': return '#64748b';
      default: return '#64748b';
    }
  }

  public getStatusLabel(f: InboundFlight): string {
    if (f.status === 'Delayed') return `Delayed +${f.delayMin}m`;
    if (f.status === 'OnTime') return 'On Time';
    return 'Scheduled';
  }
}
