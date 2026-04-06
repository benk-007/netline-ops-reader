package com.ram.netline_reader_backend.entity.oracle;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Represents a single flight leg — the core entity of the flight operations view.
 *
 * A "leg" is one segment of a flight from departure to arrival. For example,
 * flight AT205 CMN→CDG is one leg. If the aircraft then continues as AT206
 * CDG→CMN, that's a second leg.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  DATA SOURCE: Oracle materialized view — READ-ONLY                 │
 * │  This entity is NEVER created, updated, or deleted by our app.     │
 * │  The Oracle DBA refreshes the materialized view periodically       │
 * │  from the Netline OPS operational database.                        │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Relationships (see UML class diagram):
 *   - 1 Leg → 1 FlightTime   (composition — scheduled & actual times)
 *   - 1 Leg → 1 FlightLoad   (composition — passenger & cargo load)
 *   - 1 Leg → 0..* Delay     (composition — delay codes for this leg)
 *   - 1 Leg → 1 Airport      (departure airport)
 *   - 1 Leg → 1 Airport      (arrival airport)
 *   - 1 Leg → 1 Aircraft     (assigned aircraft)
 */
@Entity
@Table(name = "MV_LEG")  // Oracle materialized view name
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Leg {
    static final int CRITICAL_DELAY_THRESHOLD = 15;

    /** Unique leg number — primary key in the Oracle view. */
    @Id
    @Column(name = "LEG_NO")
    private Long legNo;

    /** Technical key used to detect updates/version changes. Maps to MV column UPDATE_KEY. */
    @Column(name = "UPDATE_KEY")
    private Long updateKey;

    /** Flight number (e.g. "201"). Maps to MV column FN_NUMBER. Combined with carrierCode to form "AT201". */
    @Column(name = "FN_NUMBER")
    private String flightNumber;

    /** IATA carrier code (e.g. "AT" for Royal Air Maroc). Maps to MV column FN_CARRIER. */
    @Column(name = "FN_CARRIER")
    private String carrierCode;

    /** Optional suffix for flight number variants (e.g. "A" → AT201A). Maps to MV column FN_SUFFIX. */
    @Column(name = "FN_SUFFIX", nullable = true)
    private String fnSuffix;

    /** Business date of the flight. Maps to MV column DAY_OF_ORIGIN. */
    @Column(name = "DAY_OF_ORIGIN")
    private LocalDate operationalDate;

    /** Timestamp of the last modification. Maps to MV column CHANGE_TIME. */
    @Column(name = "CHANGE_TIME", nullable = true)
    private LocalDateTime changeTime;

    /** User or system that last updated the record. Maps to MV column ENTRY_USER. */
    @Column(name = "ENTRY_USER", nullable = true)
    private String entryUser;

    /**
     * Current state of the leg in the operational lifecycle.
     * Typical values: "SCHEDULED", "BOARDING", "DEPARTED", "AIRBORNE",
     *                 "LANDED", "ARRIVED", "CANCELLED"
     */
    @Column(name = "LEG_STATE")
    private String legState;

    /**
     * Type of leg / service type.
     * Typical values: "J" (PAX scheduled), "C" (Cargo), "F" (Ferry/positioning)
     */
    @Column(name = "LEG_TYPE")
    private String legType;

    // ── Composition relationships (part of this leg) ─────────────────

    /**
     * Flight times — scheduled, estimated, and actual timestamps.
     * One-to-one composition: every leg has exactly one set of times.
     */
    @OneToOne(mappedBy = "leg", fetch = FetchType.LAZY)
    private FlightTime flightTime;

    /**
     * Flight load — passenger counts and cargo weights.
     * One-to-one composition: every leg has exactly one load record.
     */
    @OneToOne(mappedBy = "leg", fetch = FetchType.LAZY)
    private FlightLoad flightLoad;

    /**
     * Delay records — zero or more delay codes applied to this leg.
     * A leg with no delays means on-time operation.
     */
    @OneToMany(mappedBy = "leg", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Delay> delays = new ArrayList<>();

    // ── Association relationships ─────────────────────────────────────

    /**
     * Scheduled departure airport. Maps to MV column DEP_AP_SCHED.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DEP_AP_SCHED", referencedColumnName = "IATA_CODE")
    private Airport departureAirport;

    /**
     * Scheduled arrival airport. Maps to MV column ARR_AP_SCHED.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ARR_AP_SCHED", referencedColumnName = "IATA_CODE")
    private Airport arrivalAirport;

    /**
     * Actual departure airport — may differ from scheduled if diverted.
     * Maps to MV column DEP_AP_ACTUAL.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "DEP_AP_ACTUAL", referencedColumnName = "IATA_CODE", nullable = true)
    private Airport actualDepartureAirport;

    /**
     * Actual arrival airport — may differ from scheduled if diverted.
     * Maps to MV column ARR_AP_ACTUAL.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ARR_AP_ACTUAL", referencedColumnName = "IATA_CODE", nullable = true)
    private Airport actualArrivalAirport;

    /**
     * Aircraft assigned to operate this leg.
     * Joined via the aircraft registration code. Maps to MV column AC_REGISTRATION.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "AC_REGISTRATION", referencedColumnName = "AC_REGISTRATION")
    private Aircraft aircraft;

    // ── Derived / computed methods ────────────────────────────────────

    /**
     * Calculates the total delay duration (in minutes) for this leg
     * by summing up all individual delay codes.
     *
     * @return total delay in minutes, or 0 if no delays
     */
    public int getDelayDuration() {
        if (delays == null || delays.isEmpty()) {
            return 0;
        }
        return delays.stream()
                .mapToInt(d -> d.getDuration() != null ? d.getDuration() : 0)
                .sum();
    }

    /**
     * Checks whether this leg has a critical delay (>= 15 minutes).
     * The 15-minute threshold is an IATA standard for "delayed" flights.
     *
     * @return true if total delay is x minutes or more
     */
    public boolean isCriticalDelay() {
        return getDelayDuration() >= CRITICAL_DELAY_THRESHOLD;
    }
}
