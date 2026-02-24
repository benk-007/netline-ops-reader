# NetLine Ops Reader - CCO Dashboard

**Airline Operations Control Dashboard** built with Angular and **vis-timeline** (100% free and open-source).

## Overview

NetLine Ops Reader is a read-only visualization tool for flight schedules, designed to run inside a Citrix environment via browser. It displays flight operations on a 24-hour timeline with aircraft registrations as groups on the left axis.

## Features

- **24-Hour Timeline View**: Displays flights across a full day with hourly granularity
- **Aircraft-Based Groups**: Left axis shows aircraft registrations (e.g., CN-RAM, CN-RGV)
- **Dual-Bar Visualization**: 
  - **Top bar (Estimated)**: Gray, dashed border showing scheduled times
  - **Bottom bar (Actual)**: Solid color showing actual flight times
- **Color-Coded Status**:
  - 🟩 Green: On Time
  - 🟧 Orange: Minor Delay (< 15 mins)
  - 🟥 Red: Critical Delay (> 15 mins)
- **Interactive Features**:
  - Hover tooltips with flight details
  - Click to view detailed flight information (OOOI times, delay codes, passenger count)
- **Filtering & Search**:
  - Date range selection
  - Airport filtering
  - Flight number search
- **Pagination**: Navigate to next day with a single click

## Technology Stack

- **Angular 17+**: Modern web framework
- **vis-timeline 7.7+**: Open-source timeline visualization library
- **vis-data 7.1+**: Data management for vis-timeline
- **TypeScript**: Type-safe development
- **100% Free**: No paid libraries or license keys required

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Installation

1. **Navigate to the project directory**:
   ```bash
   cd /Users/benk007/Downloads/Gantt_chart
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Running the Application

**Development Server**:
```bash
npm start
```

The application will open automatically at `http://localhost:4200`

**Build for Production**:
```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── dashboard.component.ts      # Main dashboard logic with vis-timeline
│   │   ├── dashboard.component.html    # Dashboard template
│   │   └── dashboard.component.css     # Dashboard styles + custom timeline styling
│   ├── models/
│   │   └── flight.model.ts             # Data models
│   ├── services/
│   │   └── flight-data.service.ts      # Mock data service
│   ├── app.component.ts                # Root component
│   └── app.config.ts                   # App configuration
├── styles.css                          # Global styles
└── index.html                          # HTML shell
```

## Mock Data

The application includes mock data for:
- **5 Aircraft**: CN-RAM (B787), CN-RGV (B737), CN-ROH (E190), CN-MAY (B737), CN-RGT (A320)
- **12 Flights**: Various routes including CMN-ORY, CMN-CDG, CMN-LHR, CMN-DXB, etc.

To modify the mock data, edit `src/app/services/flight-data.service.ts`.

## Customization

### Branding Colors

Royal Air Maroc colors are defined in `src/styles.css`:
```css
--ram-red: #D71920;
--ram-dark-red: #B01419;
```

### Timeline Configuration

Adjust timeline settings in `dashboard.component.ts`:
```typescript
const options: TimelineOptions = {
  start: new Date(...),
  end: new Date(...),
  zoomable: false,
  moveable: true,
  // ... more options
};
```

### Dual-Bar Template

The custom dual-bar rendering is implemented in the `createFlightTemplate()` method:
```typescript
private createFlightTemplate(item: any): string {
  return `
    <div class="flight-item-container">
      <div class="estimated-bar">...</div>
      <div class="actual-bar">...</div>
    </div>
  `;
}
```

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

Optimized for Citrix browser environments.

## Key Implementation Details

### Vis-Timeline Integration

The dashboard uses vis-timeline's `Timeline` class with custom HTML templates for rendering flight bars:

1. **Groups**: Aircraft registrations (CN-RAM, CN-RGV, etc.)
2. **Items**: Individual flights with start/end times
3. **Template Function**: Custom HTML rendering for dual-bar visualization
4. **Event Handling**: Click events to show flight details panel

### Dual-Bar Rendering

Each flight item displays two stacked bars:
- **Estimated Bar**: Shows scheduled start/end times (gray, dashed)
- **Actual Bar**: Shows actual start/end times (colored by status)

This is achieved through custom HTML templates and CSS styling.

## Documentation

- [vis-timeline Documentation](https://visjs.github.io/vis-timeline/docs/timeline/)
- [Angular Documentation](https://angular.io/docs)

## License

This project uses only open-source libraries:
- vis-timeline: MIT/Apache-2.0 License
- Angular: MIT License

No commercial licenses required.

## Support

For issues or questions, please refer to:
- [vis-timeline GitHub](https://github.com/visjs/vis-timeline)
- [Angular GitHub](https://github.com/angular/angular)
