package com.ram.netline_reader_backend.entity.oracle;

import jakarta.persistence.*;
import lombok.*;

/**
 * Airport reference data — used for departure and arrival lookups.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  DATA SOURCE: Oracle materialized view — READ-ONLY                 │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * The primary key is the 3-letter IATA code (e.g. "CMN" for Casablanca,
 * "CDG" for Paris Charles de Gaulle, "JFK" for New York).
 *
 * Relationship with Leg:
 *   - A leg has one departure airport and one arrival airport.
 *   - An airport can be the departure or arrival for many legs.
 *
 * The actualDepStation / actualArrStation fields capture the station
 * as reported by operations (may differ from scheduled if diverted).
 */
@Entity
@Table(name = "MV_AIRPORT")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Airport {

    /** 3-letter IATA airport code — natural primary key. */
    @Id
    @Column(name = "IATA_CODE")
    private String iataCode;

    /** Full airport name (e.g. "Mohammed V International Airport"). */
    @Column(name = "FULL_NAME")
    private String fullName;

    /** IANA time zone identifier (e.g. "Africa/Casablanca", "Europe/Paris"). */
    @Column(name = "TIME_ZONE")
    private String timeZone;

    /** City where the airport is located (e.g. "Casablanca", "Paris"). */
    @Column(name = "CITY")
    private String city;

    /** Geographical latitude (decimal degrees). */
    @Column(name = "LATITUDE", nullable = true)
    private Double latitude;

    /** Geographical longitude (decimal degrees). */
    @Column(name = "LONGITUDE", nullable = true)
    private Double longitude;
}
