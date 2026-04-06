package com.ram.netline_reader_backend.entity.oracle;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * JPA entity mapping to the flat Oracle Netline Materialized View.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  DATA SOURCE: Oracle flat MV — READ-ONLY                           │
 * │  Table name: MV_NETLINE_LEGS  ← replace with actual MV name        │
 * │  This entity is NEVER written to. @Immutable prevents dirty checks. │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Every row corresponds to one flight leg with ALL related data denormalized
 * into a single flat record (airports, aircraft, times, load, delays).
 *
 * This raw row is mapped to the structured entity graph (Leg → Aircraft,
 * Airport, FlightTime, FlightLoad, Delay) by
 * {@link com.ram.netline_reader_backend.mapper.MvLegMapper}.
 *
 * Column sections match the MV specification:
 *   §1 LEG      — core identity and lifecycle
 *   §2 FLIGHT   — commercial identification (FN_CARRIER + FN_NUMBER + FN_SUFFIX)
 *   §3 AIRCRAFT — AC_OWNER / AC_SUBTYPE / AC_VERSION / AC_REGISTRATION
 *   §4 AIRPORT  — scheduled and actual dep/arr stations (IATA codes)
 *   §5 TIMES    — scheduled (split date+time) and OOOI actuals
 *   §6 DELAYS   — up to 3 flat delay slots
 *   §7 LOAD     — PRBD (pax réservés à bord)
 *
 * NOTE on time columns (§5):
 *   Oracle does not have a pure TIME type. If columns are stored as Oracle DATE
 *   (which includes a date portion), Hibernate may map them to LocalDateTime
 *   rather than LocalTime. In that case replace LocalTime with LocalDateTime here
 *   and extract .toLocalTime() in MvLegMapper.combine().
 */
@Entity
@Immutable
@Table(name = "MV_NETLINE_LEGS") // TODO: replace with the actual Oracle MV table name
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MvLegRow {

    // ── §1 LEG ──────── ──────────────────────────────────────────────────

    /** LEG_NO — unique identifier of the flight leg (PK). */
    @Id
    @Column(name = "LEG_NO")
    private Long legNo;

    /** UPDATE_KEY — technical version key; changes on every update in Netline. */
    @Column(name = "UPDATE_KEY")
    private Long updateKey;

    /** LEG_STATE — operational status (e.g. PLANNED, ACTIVE, COMPLETED, CANCELLED). */
    @Column(name = "LEG_STATE")
    private String legState;

    /** LEG_TYPE — service type (e.g. PAX, CARGO, CHARTER). */
    @Column(name = "LEG_TYPE")
    private String legType;

    /** DAY_OF_ORIGIN — business date of the flight. */
    @Column(name = "DAY_OF_ORIGIN")
    private LocalDate dayOfOrigin;

    /** CHANGE_TIME — timestamp of the last record modification in Netline. */
    @Column(name = "CHANGE_TIME")
    private LocalDateTime changeTime;

    /** ENTRY_USER — user or system that created/last updated the record. */
    @Column(name = "ENTRY_USER")
    private String entryUser;

    // ── §2 FLIGHT ───────────────────────────────────────────────────────

    /** FN_CARRIER — IATA airline designator (e.g. "AT"). */
    @Column(name = "FN_CARRIER")
    private String fnCarrier;

    /**
     * FN_NUMBER — numeric part of the flight number (e.g. "201").
     * Combined with FN_CARRIER and FN_SUFFIX to form the full identifier "AT201A".
     */
    @Column(name = "FN_NUMBER")
    private String fnNumber;

    /** FN_SUFFIX — optional variant suffix (e.g. "A" → AT201A); null when absent. */
    @Column(name = "FN_SUFFIX")
    private String fnSuffix;

    // ── §3 AIRCRAFT ─────────────────────────────────────────────────────

    /** AC_OWNER — aircraft owner/operator code (e.g. "RAM"). */
    @Column(name = "AC_OWNER")
    private String acOwner;

    /** AC_SUBTYPE — aircraft model (e.g. "B737-800", "B787-9"). */
    @Column(name = "AC_SUBTYPE")
    private String acSubtype;

    /** AC_VERSION — aircraft configuration version (e.g. "WINGLET"). */
    @Column(name = "AC_VERSION")
    private String acVersion;

    /** AC_REGISTRATION — tail number (e.g. "CN-RGA"). */
    @Column(name = "AC_REGISTRATION")
    private String acRegistration;

    // ── §4 AIRPORT ──────────────────────────────────────────────────────

    /** DEP_AP_SCHED — scheduled departure airport IATA code (e.g. "CMN"). */
    @Column(name = "DEP_AP_SCHED")
    private String depApSched;

    /** ARR_AP_SCHED — scheduled arrival airport IATA code (e.g. "CDG"). */
    @Column(name = "ARR_AP_SCHED")
    private String arrApSched;

    /** DEP_AP_ACTUAL — actual departure airport; may differ from scheduled if diverted. */
    @Column(name = "DEP_AP_ACTUAL")
    private String depApActual;

    /** ARR_AP_ACTUAL — actual arrival airport; may differ from scheduled if diverted. */
    @Column(name = "ARR_AP_ACTUAL")
    private String arrApActual;

    // ── §5 TIMES ────────────────────────────────────────────────────────

    /** DEP_DAY_SCHED — scheduled departure date (date part of STD). */
    @Column(name = "DEP_DAY_SCHED")
    private LocalDate depDaySched;

    /**
     * DEP_TIME_SCHED — scheduled departure time (time part of STD, e.g. 08:30).
     * See class-level note on Oracle time column types.
     */
    @Column(name = "DEP_TIME_SCHED")
    private LocalTime depTimeSched;

    /** ARR_DAY_SCHED — scheduled arrival date (date part of STA). */
    @Column(name = "ARR_DAY_SCHED")
    private LocalDate arrDaySched;

    /**
     * ARR_TIME_SCHED — scheduled arrival time (time part of STA, e.g. 12:00).
     * See class-level note on Oracle time column types.
     */
    @Column(name = "ARR_TIME_SCHED")
    private LocalTime arrTimeSched;

    /** OFF_BLOCK_TIME — actual off-block time (aircraft leaves gate). */
    @Column(name = "OFF_BLOCK_TIME")
    private LocalTime offBlockTime;

    /** AIRBORNE_TIME — actual takeoff time (wheels off). */
    @Column(name = "AIRBORNE_TIME")
    private LocalTime airborneTime;

    /** LANDING_TIME — actual landing time (wheels on). */
    @Column(name = "LANDING_TIME")
    private LocalTime landingTime;

    /** ON_BLOCK_TIME — actual on-block time (aircraft reaches arrival gate). */
    @Column(name = "ON_BLOCK_TIME")
    private LocalTime onBlockTime;

    // ── §6 DELAYS ───────────────────────────────────────────────────────

    /** DELAY_CODE_01 — primary delay reason code (IATA standard, e.g. "15"). */
    @Column(name = "DELAY_CODE_01")
    private String delayCode01;

    /** DELAY_TIME_01 — duration of primary delay in minutes. */
    @Column(name = "DELAY_TIME_01")
    private Integer delayTime01;

    /** DELAY_CODE_02 — secondary delay code; null when no second delay. */
    @Column(name = "DELAY_CODE_02")
    private String delayCode02;

    /** DELAY_TIME_02 — duration of secondary delay in minutes; null when absent. */
    @Column(name = "DELAY_TIME_02")
    private Integer delayTime02;

    /** DELAY_CODE_03 — tertiary delay code; null when no third delay. */
    @Column(name = "DELAY_CODE_03")
    private String delayCode03;

    /** DELAY_TIME_03 — duration of tertiary delay in minutes; null when absent. */
    @Column(name = "DELAY_TIME_03")
    private Integer delayTime03;

    // ── §7 LOAD ─────────────────────────────────────────────────────────

    /** PRBD — number of passengers booked (pax réservés à bord). */
    @Column(name = "PRBD")
    private Integer prbd;
}
