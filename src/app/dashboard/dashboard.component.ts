import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Timeline, TimelineOptions } from 'vis-timeline/standalone';
import { DataSet } from 'vis-data';
import { FlightDataService } from '../services/flight-data.service';
import { FlightTask, FlightDetails, FlightStatus } from '../models/flight.model';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('timeline', { static: false }) timelineContainer!: ElementRef;

  private timeline!: Timeline;
  private items!: DataSet<any>;
  private groups!: DataSet<any>;

  // ─── Window State ────────────────────────────────────────────────────────
  private currentWindowStart: Date = new Date();
  private currentWindowEnd: Date = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

  // ─── Filter State ────────────────────────────────────────────────────────
  public filterAirport: string = 'ALL';
  public filterFlightNumber: string = '';
  public filterStartDate: string = '';
  public filterEndDate: string = '';

  public timezone: 'UTC' | 'Local' = 'UTC';

  // ─── UI State ────────────────────────────────────────────────────────────
  public isProfileMenuOpen: boolean = false;
  public selectedFlight: FlightDetails | null = null;
  public showDetailsPanel: boolean = false;

  // ─── Display Date getter ─────────────────────────────────────────────────
  public get displayDate(): string {
    return this.currentWindowStart.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // ─── Totals ───────────────────────────────────────────────────────────────
  public get totalFlights(): number { return this._filteredFlights.length; }
  public get totalAircraft(): number {
    return new Set(this._filteredFlights.map(f => f.Aircraft)).size;
  }

  // ─── Airport Options ─────────────────────────────────────────────────────
  public airports = [
    { code: 'CMN', name: 'CMN - Casablanca' },
    { code: 'RAK', name: 'RAK - Marrakech' },
    { code: 'AGA', name: 'AGA - Agadir' },
    { code: 'FEZ', name: 'FEZ - Fez' },
    { code: 'TNG', name: 'TNG - Tangier' }
  ];

  private allFlights: FlightTask[] = [];
  private _filteredFlights: FlightTask[] = [];

  constructor(private flightDataService: FlightDataService) { }

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const settings = localStorage.getItem('settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      this.timezone = parsed.timezone || 'UTC';
    }
    const now = new Date();
    this.currentWindowStart = new Date(now);
    this.currentWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    this.allFlights = this.flightDataService.getFlights();
    this._filteredFlights = [...this.allFlights];
  }

  ngAfterViewInit(): void {
    this.initializeTimeline();
  }

  ngOnDestroy(): void {
    if (this.timeline) this.timeline.destroy();
  }

  // ─── Timeline Init ────────────────────────────────────────────────────────
  private initializeTimeline(): void {
    const uniqueAircraft = Array.from(new Set(this.allFlights.map(f => f.Aircraft)));
    const groupsData = uniqueAircraft
      .map(aircraft => ({ id: aircraft.split(' ')[0], content: aircraft }))
      .sort((a, b) => a.id.localeCompare(b.id));

    this.groups = new DataSet(groupsData);
    this.items = new DataSet([]);

    const options: TimelineOptions = {
      start: this.currentWindowStart,
      end: this.currentWindowEnd,
      min: new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000),
      max: new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000),
      zoomable: true,
      zoomMin: 1000 * 60 * 60,
      zoomMax: 1000 * 60 * 60 * 24 * 30,
      moveable: true,
      horizontalScroll: true,
      verticalScroll: true,
      height: '100%',
      maxHeight: '100%',
      orientation: 'top',
      stack: false,
      showCurrentTime: true,
      // Feature 1: Dual-bar template
      template: (item: any) => this.createDualBarTemplate(item),
      // Feature 4: Custom tooltip (no browser default)
      tooltip: {
        followMouse: true,
        overflowMethod: 'cap',
        template: (item: any) => this.createTooltipTemplate(item)
      },
      format: {
        minorLabels: { hour: 'HH:mm', minute: 'HH:mm' },
        majorLabels: { day: 'ddd DD MMM', month: 'MMMM YYYY' }
      }
    };

    this.timeline = new Timeline(
      this.timelineContainer.nativeElement,
      this.items,
      this.groups,
      options
    );

    // Feature 4: Click → Detail Panel
    this.timeline.on('select', (props: any) => {
      if (props.items && props.items.length > 0) {
        const item = this.items.get(props.items[0]);
        if (item) this.openDetailPanel(item);
      } else {
        this.closeDetailsPanel();
      }
    });

    this.pushItemsToTimeline();
  }

  // ─── Feature 1: Dual-Bar Template ────────────────────────────────────────
  private createDualBarTemplate(item: any): string {
    const color = this.getStatusHexColor(item.status);
    const isEst = item.isEstimated;
    const etd = this.formatTime(item.start);
    const eta = this.formatTime(item.end);
    const fn = item.flightNumber || '';

    if (isEst) {
      // Top bar – Scheduled (transparent / outlined)
      return `
        <div class="dual-bar scheduled-bar" style="border-color:${color}; background:${color}26;">
          <span class="bar-text">${fn} | ETD ${etd} – ETA ${eta}</span>
        </div>`;
    } else {
      // Bottom bar – Actual (solid)
      return `
        <div class="dual-bar actual-bar" style="background:${color};">
          <span class="bar-text">${fn} | ATD ${etd} – ATA ${eta}</span>
        </div>`;
    }
  }

  // ─── Feature 4: Hover Tooltip Card ───────────────────────────────────────
  private createTooltipTemplate(item: any): string {
    const color = this.getStatusHexColor(item.status);
    const statusText = this.getStatusText(item.status);
    const delayBadge = (item.delayMinutes > 0)
      ? `<span class="tt-delay">⚠ +${item.delayMinutes}m (${item.delayCode || '—'})</span>`
      : `<span class="tt-nodelay">✓ On Time</span>`;

    return `
      <div class="tt-card">
        <div class="tt-header" style="border-left: 4px solid ${color}">
          <span class="tt-fno">${item.flightNumber}</span>
          <span class="tt-badge" style="background:${color}">${statusText}</span>
        </div>
        <div class="tt-body">
          <div class="tt-row"><span class="tt-lbl">Aircraft</span><span class="tt-val">${item.aircraft || '—'}</span></div>
          <div class="tt-row"><span class="tt-lbl">Route</span><span class="tt-val">${item.origin || ''} → ${item.destination || ''}</span></div>
          <div class="tt-row"><span class="tt-lbl">Passengers</span><span class="tt-val">${item.paxCount || 0} pax</span></div>
          <div class="tt-row"><span class="tt-lbl">${item.isEstimated ? 'Scheduled' : 'Actual'}</span><span class="tt-val">${this.formatTime(item.start)} → ${this.formatTime(item.end)}</span></div>
          <div class="tt-status-row">${delayBadge}</div>
        </div>
      </div>`;
  }

  // ─── Feature 2: Wired Filter Logic ───────────────────────────────────────
  public applyFilters(): void {
    let flights = [...this.allFlights];

    if (this.filterAirport && this.filterAirport !== 'ALL') {
      flights = flights.filter(f => f.Airport === this.filterAirport);
    }
    if (this.filterFlightNumber && this.filterFlightNumber.trim()) {
      const q = this.filterFlightNumber.trim().toLowerCase();
      flights = flights.filter(f => f.TaskName.toLowerCase().includes(q));
    }
    if (this.filterStartDate) {
      const start = new Date(this.filterStartDate);
      start.setHours(0, 0, 0, 0);
      flights = flights.filter(f => new Date(f.StartDate) >= start);
    }
    if (this.filterEndDate) {
      const end = new Date(this.filterEndDate);
      end.setHours(23, 59, 59, 999);
      flights = flights.filter(f => new Date(f.StartDate) <= end);
    }
    if (this.filterStartDate) {
      const start = new Date(this.filterStartDate);
      const end = this.filterEndDate ? new Date(this.filterEndDate) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
      end.setHours(23, 59, 59, 999);
      this.currentWindowStart = start;
      this.currentWindowEnd = end;
      if (this.timeline) this.timeline.setWindow(start, end);
    }

    this._filteredFlights = flights;
    this.pushItemsToTimeline();
  }

  public clearFilters(): void {
    this.filterAirport = 'ALL';
    this.filterFlightNumber = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this._filteredFlights = [...this.allFlights];
    this.pushItemsToTimeline();
  }

  // ─── Feature 3: Navigation ───────────────────────────────────────────────
  public onPrevious(): void {
    const shift = 24 * 60 * 60 * 1000;
    this.currentWindowStart = new Date(this.currentWindowStart.getTime() - shift);
    this.currentWindowEnd = new Date(this.currentWindowEnd.getTime() - shift);
    if (this.timeline) this.timeline.setWindow(this.currentWindowStart, this.currentWindowEnd);
  }

  public onNow(): void {
    const now = new Date();
    this.currentWindowStart = new Date(now);
    this.currentWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (this.timeline) this.timeline.setWindow(this.currentWindowStart, this.currentWindowEnd);
  }

  public onNext(): void {
    const shift = 24 * 60 * 60 * 1000;
    this.currentWindowStart = new Date(this.currentWindowStart.getTime() + shift);
    this.currentWindowEnd = new Date(this.currentWindowEnd.getTime() + shift);
    if (this.timeline) this.timeline.setWindow(this.currentWindowStart, this.currentWindowEnd);
  }

  // ─── Feature 4: Detail Panel ─────────────────────────────────────────────
  private openDetailPanel(item: any): void {
    const start = new Date(item.start);
    const end = new Date(item.end);
    this.selectedFlight = {
      flightNumber: item.flightNumber,
      route: item.route,
      origin: item.origin,
      destination: item.destination,
      aircraft: item.aircraft,
      status: item.status,
      delayMinutes: item.delayMinutes || 0,
      delayCode: item.delayCode || '—',
      paxCount: item.paxCount || 0,
      estimatedOut: start,
      estimatedOff: new Date(start.getTime() + 15 * 60000),
      estimatedOn: new Date(end.getTime() - 15 * 60000),
      estimatedIn: end,
      actualOut: start,
      actualOff: new Date(start.getTime() + 15 * 60000),
      actualOn: new Date(end.getTime() - 15 * 60000),
      actualIn: end
    };
    this.showDetailsPanel = true;
  }

  public closeDetailsPanel(): void {
    this.showDetailsPanel = false;
    this.selectedFlight = null;
    if (this.timeline) this.timeline.setSelection([]);
  }

  // ─── Feature 5: Profile Menu ─────────────────────────────────────────────
  public toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  public closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  public onRefresh(): void {
    this.allFlights = this.flightDataService.getFlights();
    this._filteredFlights = [...this.allFlights];
    this.pushItemsToTimeline();
  }

  private pushItemsToTimeline(): void {
    if (!this.items) return;

    const timelineItems: any[] = [];
    this._filteredFlights.forEach(flight => {
      const common = {
        group: flight.Aircraft.split(' ')[0],
        subgroup: flight.TaskID,
        flightNumber: flight.TaskName,
        status: flight.Status,
        origin: flight.Origin,
        destination: flight.Destination,
        route: flight.Route,
        aircraft: flight.Aircraft,
        paxCount: flight.PaxCount,
        delayMinutes: flight.DelayMinutes,
        delayCode: flight.DelayCode,
        type: 'range',
        title: ' '  // disables native browser tooltip; custom handled via options.tooltip.template
      };

      // Estimated (Scheduled) bar — isEstimated: true
      timelineItems.push({
        ...common,
        id: `${flight.TaskID}_est`,
        content: flight.TaskName,
        start: flight.BaselineStartDate,
        end: flight.BaselineEndDate,
        className: `flight-vis-item est-item status-${this.getStatusClass(flight.Status)}`,
        isEstimated: true
      });

      // Actual bar — isEstimated: false
      timelineItems.push({
        ...common,
        id: `${flight.TaskID}_act`,
        content: flight.TaskName,
        start: flight.StartDate,
        end: flight.EndDate,
        className: `flight-vis-item act-item status-${this.getStatusClass(flight.Status)}`,
        isEstimated: false
      });
    });

    this.items.clear();
    this.items.add(timelineItems);
  }

  public getStatusClass(status: FlightStatus): string {
    return this.flightDataService.getStatusClass(status);
  }

  public getStatusText(status: FlightStatus): string {
    switch (status) {
      case FlightStatus.OnTime: return 'On Time';
      case FlightStatus.MinorDelay: return 'Minor Delay';
      case FlightStatus.CriticalDelay: return 'Critical Delay';
      default: return 'Unknown';
    }
  }

  private getStatusHexColor(status: FlightStatus): string {
    switch (status) {
      case FlightStatus.OnTime: return '#27AE60';
      case FlightStatus.MinorDelay: return '#F39C12';
      case FlightStatus.CriticalDelay: return '#D71920';
      default: return '#27AE60';
    }
  }

  public formatTime(date: Date | undefined): string {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  }
}
