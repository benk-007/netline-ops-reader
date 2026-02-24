import { Injectable } from '@angular/core';
import { FlightTask, FlightStatus, Airport } from '../models/flight.model';

@Injectable({
  providedIn: 'root'
})
export class FlightDataService {
  private mockFlights: FlightTask[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const baseDate = new Date();
    // Reset to start of today for consistent data generation relative to "now"
    baseDate.setHours(0, 0, 0, 0);

    const aircraftList: string[] = [];
    // Generate 35 Aircraft (CN-R01 to CN-R35)
    for (let i = 1; i <= 35; i++) {
      const suffix = i < 10 ? `0${i}` : `${i}`;
      // Mix of aircraft types
      const type = i % 3 === 0 ? 'B787' : (i % 2 === 0 ? 'B737' : 'E190');
      aircraftList.push(`CN-R${suffix} (${type})`);
    }

    const airports = ['CMN', 'ORY', 'CDG', 'LHR', 'MAD', 'BCN', 'IST', 'FCO', 'DXB', 'JFK', 'YUL', 'DOHA'];

    let taskIdCounter = 1;
    this.mockFlights = [];

    // Generate flights for each aircraft for today and tomorrow
    // to ensure coverage for the rolling window
    [-1, 0, 1].forEach(dayOffset => {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + dayOffset);

      aircraftList.forEach(aircraft => {
        // 5 to 8 flights per aircraft per day
        const numFlights = Math.floor(Math.random() * 4) + 5;
        let currentHour = 0;

        for (let f = 0; f < numFlights; f++) {
          // Gap between flights (1-3 hours)
          const gap = Math.floor(Math.random() * 120) + 60;
          // Flight duration (1-4 hours)
          const duration = Math.floor(Math.random() * 180) + 60;

          const startMinutes = (currentHour * 60) + gap;
          const endMinutes = startMinutes + duration;

          if (endMinutes >= 24 * 60) break; // Stop if goes past midnight

          const start = new Date(currentDate);
          start.setHours(0, startMinutes, 0, 0);

          const end = new Date(currentDate);
          end.setHours(0, endMinutes, 0, 0);

          // Determine Status (70% OnTime, 20% Minor, 10% Critical)
          const rand = Math.random();
          let status = FlightStatus.OnTime;
          let delay = 0;
          let delayCode = '';

          if (rand > 0.90) {
            status = FlightStatus.CriticalDelay;
            delay = Math.floor(Math.random() * 120) + 45; // 45m+ delay
            delayCode = 'TECH';
          } else if (rand > 0.70) {
            status = FlightStatus.MinorDelay;
            delay = Math.floor(Math.random() * 40) + 5; // 5-45m delay
            delayCode = 'WX';
          }

          // Actual times (Baseline + Delay)
          const actualStart = new Date(start.getTime() + (delay * 60000));
          const actualEnd = new Date(end.getTime() + (delay * 60000));

          const origin = 'CMN';
          const dest = airports[Math.floor(Math.random() * airports.length)];
          const flightNum = `AT${Math.floor(Math.random() * 900) + 100}`;

          this.mockFlights.push({
            TaskID: taskIdCounter++,
            TaskName: flightNum,
            Aircraft: aircraft,
            Airport: 'CMN',
            Origin: origin,
            Destination: dest,
            Route: `${origin}-${dest}`,
            PaxCount: Math.floor(Math.random() * 150) + 50,
            Status: status,
            BaselineStartDate: start,
            BaselineEndDate: end,
            StartDate: actualStart,
            EndDate: actualEnd,
            DelayMinutes: delay,
            DelayCode: delayCode,
            OutTime: actualStart,
            OffTime: new Date(actualStart.getTime() + 15 * 60000),
            OnTime: new Date(actualEnd.getTime() - 15 * 60000),
            InTime: actualEnd
          });

          currentHour = endMinutes / 60;
        }
      });
    });
  }

  getFlights(): FlightTask[] {
    return this.mockFlights;
  }

  getFlightsByDateRange(fromDate: Date, toDate: Date): FlightTask[] {
    return this.mockFlights.filter(flight => {
      const flightDate = new Date(flight.StartDate);
      return flightDate >= fromDate && flightDate <= toDate;
    });
  }

  getFlightsByAirport(airport: string): FlightTask[] {
    if (!airport || airport === 'ALL') {
      return this.mockFlights;
    }
    return this.mockFlights.filter(flight => flight.Airport === airport);
  }

  searchFlightByNumber(flightNumber: string): FlightTask[] {
    if (!flightNumber) {
      return this.mockFlights;
    }
    return this.mockFlights.filter(flight =>
      flight.TaskName.toLowerCase().includes(flightNumber.toLowerCase())
    );
  }

  getAirports(): Airport[] {
    return [
      { code: 'CMN', name: 'CMN - Casablanca' },
      { code: 'RAK', name: 'RAK - Marrakech' },
      { code: 'AGA', name: 'AGA - Agadir' },
      { code: 'FEZ', name: 'FEZ - Fez' },
      { code: 'TNG', name: 'TNG - Tangier' }
    ];
  }

  getStatusClass(status: FlightStatus): string {
    switch (status) {
      case FlightStatus.OnTime:
        return 'status-on-time';
      case FlightStatus.MinorDelay:
        return 'status-minor-delay';
      case FlightStatus.CriticalDelay:
        return 'status-critical-delay';
      default:
        return 'status-on-time';
    }
  }
}
