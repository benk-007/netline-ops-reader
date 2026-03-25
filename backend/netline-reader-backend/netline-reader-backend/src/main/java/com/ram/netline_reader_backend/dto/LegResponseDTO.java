package com.ram.netline_reader_backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Response payload for a flight leg with all its nested data.
 *
 * This is the main DTO returned by the Leg API — it flattens and
 * aggregates data from multiple Oracle entities (Leg, FlightTime,
 * FlightLoad, Delay, Airport, Aircraft) into a single response
 * that the frontend can consume without extra API calls.
 *
 * Structure mirrors the UML class diagram relationships.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LegResponseDTO {

    // ── Leg core fields ──────────────────────────────────────────
    private Long legNo;
    private String flightNumber;
    private String carrierCode;
    private LocalDate operationalDate;
    private String legState;
    private String legType;

    // ── Computed fields from Leg methods ──────────────────────────
    /** Total delay in minutes (sum of all delay codes). */
    private Integer delayDuration;
    /** True if total delay >= threshhold minutes (IATA critical threshold). */
    private Boolean criticalDelay;

    // ── Nested DTOs ──────────────────────────────────────────────
    private FlightTimeDTO flightTime;
    private FlightLoadDTO flightLoad;
    private List<DelayDTO> delays;
    private AirportDTO departureAirport;
    private AirportDTO arrivalAirport;
    private AircraftDTO aircraft;

    // ════════════════════════════════════════════════════════════════
    // Inner DTO classes — kept here to avoid file explosion.
    // Each one maps to a single Oracle entity.
    // ════════════════════════════════════════════════════════════════

    /** Flight time data — scheduled, estimated, and actual timestamps. */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FlightTimeDTO {
        private LocalDateTime std;   // Scheduled departure
        private LocalDateTime sta;   // Scheduled arrival
        private LocalDateTime etd;   // Estimated departure
        private LocalDateTime eta;   // Estimated arrival
        private LocalDateTime offBlock;
        private LocalDateTime airborne;
        private LocalDateTime landing;
        private LocalDateTime onBlock;
    }

    /** Flight load data — passenger counts and cargo weights. */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FlightLoadDTO {
        private Integer paxBooked;      // Total reserved
        private Integer paxFlown;       // Actually boarded
        private Integer paxBusiness;
        private Integer paxEconomy;
        private Double cargoWeight;     // kg
        private Double baggageWeight;   // kg
    }

    /** Single delay code record. */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DelayDTO {
        private String code;
        private Integer duration;      // minutes
        private String description;
    }

    /** Airport summary (departure or arrival). */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AirportDTO {
        private String iataCode;
        private String fullName;
        private String timeZone;
        private Double latitude;
        private Double longitude;
    }

    /** Aircraft summary. */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AircraftDTO {
        private String registration;
        private String subType;
        private Double maxWeight;
        private Double cargoCapacity;
    }
}
