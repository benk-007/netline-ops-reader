package com.ram.netline_reader_backend.entity.fake;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Flat PostgreSQL table that simulates an Oracle Materialized View for flight legs.
 *
 * In development, the real Oracle MV (MV_LEG + related views) is replaced by this
 * single denormalized table. Data is populated and refreshed by {@code FakeMvRefreshJob}.
 *
 * Column naming intentionally mirrors the Oracle MV column semantics so the
 * {@code FakeLegDataProvider} can build identical {@code LegResponseDTO}s.
 */
@Entity
@Table(name = "leg_mv", indexes = {
        @Index(name = "idx_leg_mv_date",           columnList = "operational_date"),
        @Index(name = "idx_leg_mv_flight_date",    columnList = "flight_number, operational_date"),
        @Index(name = "idx_leg_mv_dep_date",       columnList = "dep_airport_code, operational_date"),
        @Index(name = "idx_leg_mv_arr_date",       columnList = "arr_airport_code, operational_date"),
        @Index(name = "idx_leg_mv_aircraft_date",  columnList = "aircraft_registration, operational_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LegMv {

    // ── Leg core ─────────────────────────────────────────────────────────
    @Id
    @Column(name = "leg_no")
    private Long legNo;

    @Column(name = "flight_number", nullable = false, length = 10)
    private String flightNumber;

    @Column(name = "carrier_code", length = 3)
    private String carrierCode;

    @Column(name = "operational_date", nullable = false)
    private LocalDate operationalDate;

    @Column(name = "leg_state", length = 20)
    private String legState;

    @Column(name = "leg_type", length = 3)
    private String legType;

    // ── Flight times ──────────────────────────────────────────────────────
    @Column(name = "std") private LocalDateTime std;
    @Column(name = "sta") private LocalDateTime sta;
    @Column(name = "etd") private LocalDateTime etd;
    @Column(name = "eta") private LocalDateTime eta;
    @Column(name = "off_block")  private LocalDateTime offBlock;
    @Column(name = "airborne")   private LocalDateTime airborne;
    @Column(name = "landing")    private LocalDateTime landing;
    @Column(name = "on_block")   private LocalDateTime onBlock;

    // ── Flight load ───────────────────────────────────────────────────────
    @Column(name = "pax_booked")    private Integer paxBooked;
    @Column(name = "pax_flown")     private Integer paxFlown;
    @Column(name = "pax_business")  private Integer paxBusiness;
    @Column(name = "pax_economy")   private Integer paxEconomy;
    @Column(name = "cargo_weight")  private Double  cargoWeight;
    @Column(name = "baggage_weight") private Double baggageWeight;

    // ── Departure airport (denormalized) ──────────────────────────────────
    @Column(name = "dep_airport_code", length = 3) private String depAirportCode;
    @Column(name = "dep_airport_name")             private String depAirportName;
    @Column(name = "dep_timezone")                 private String depTimezone;
    @Column(name = "dep_latitude")                 private Double depLatitude;
    @Column(name = "dep_longitude")                private Double depLongitude;

    // ── Arrival airport (denormalized) ────────────────────────────────────
    @Column(name = "arr_airport_code", length = 3) private String arrAirportCode;
    @Column(name = "arr_airport_name")             private String arrAirportName;
    @Column(name = "arr_timezone")                 private String arrTimezone;
    @Column(name = "arr_latitude")                 private Double arrLatitude;
    @Column(name = "arr_longitude")                private Double arrLongitude;

    // ── Aircraft (denormalized) ───────────────────────────────────────────
    @Column(name = "aircraft_registration", length = 10) private String aircraftRegistration;
    @Column(name = "aircraft_sub_type",     length = 20) private String aircraftSubType;
    @Column(name = "aircraft_max_weight")               private Double  aircraftMaxWeight;
    @Column(name = "aircraft_cargo_capacity")           private Double  aircraftCargoCapacity;

    // ── Metadata ──────────────────────────────────────────────────────────
    @Column(name = "last_refreshed")
    private LocalDateTime lastRefreshed;

    // ── Delays (1:N) ──────────────────────────────────────────────────────
    @OneToMany(mappedBy = "legMv", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<LegMvDelay> delays = new ArrayList<>();

    // ── Computed helpers (mirrors Leg entity behaviour) ───────────────────

    public int getDelayDuration() {
        if (delays == null || delays.isEmpty()) return 0;
        return delays.stream()
                .mapToInt(d -> d.getDuration() != null ? d.getDuration() : 0)
                .sum();
    }

    public boolean isCriticalDelay() {
        return getDelayDuration() >= 15;
    }
}
