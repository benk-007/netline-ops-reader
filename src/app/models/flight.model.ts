export enum FlightStatus {
  OnTime = 'OnTime',
  MinorDelay = 'MinorDelay',
  CriticalDelay = 'CriticalDelay'
}

export interface FlightTask {
  TaskID: number;
  TaskName: string;
  StartDate: Date;
  EndDate: Date;
  BaselineStartDate: Date;
  BaselineEndDate: Date;
  Status: FlightStatus;
  Airport: string;
  Aircraft: string;
  Route: string;
  Origin: string;
  Destination: string;
  PaxCount: number;
  DelayCode?: string;
  DelayMinutes?: number;
  // OOOI Times (Out, Off, On, In)
  OutTime?: Date;
  OffTime?: Date;
  OnTime?: Date;
  InTime?: Date;
}

export interface FlightDetails {
  flightNumber: string;
  route: string;
  origin: string;
  destination: string;
  aircraft: string;
  status: FlightStatus;
  delayMinutes: number;
  delayCode: string;
  paxCount: number;
  // Estimated Times
  estimatedOut: Date;
  estimatedOff: Date;
  estimatedOn: Date;
  estimatedIn: Date;
  // Actual Times
  actualOut?: Date;
  actualOff?: Date;
  actualOn?: Date;
  actualIn?: Date;
}

export interface Airport {
  code: string;
  name: string;
}
