package com.ram.netline_reader_backend.entity.oracle;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Flight time record — all scheduled, estimated, and actual timestamps for a leg.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  DATA SOURCE: Oracle materialized view — READ-ONLY                 │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Timeline of a flight leg (in chronological order):
 *
 *   STD (Scheduled Dep)  → the published departure time
 *   ETD (Estimated Dep)  → updated estimate (may equal STD if on time)
 *   OFF-BLOCK            → aircraft pushes back from the gate
 *   AIRBORNE             → wheels leave the ground (takeoff)
 *   LANDING              → wheels touch the ground
 *   ON-BLOCK             → aircraft arrives at the gate
 *   STA (Scheduled Arr)  → the published arrival time
 *   ETA (Estimated Arr)  → updated arrival estimate
 *
 * Composition: each FlightTime belongs to exactly one {@link Leg}.
 */
@Entity
@Table(name = "MV_FLIGHT_TIME")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlightTime {

    @Id
    @Column(name = "ID")
    private Long id;

    /** Scheduled Time of Departure — the published timetable departure. */
    @Column(name = "STD")
    private LocalDateTime std;

    /** Scheduled Time of Arrival — the published timetable arrival. */
    @Column(name = "STA")
    private LocalDateTime sta;

    /** Estimated Time of Departure — updated departure estimate. */
    @Column(name = "ETD",nullable= true)
    private LocalDateTime etd;

    /** Estimated Time of Arrival — updated arrival estimate. */
    @Column(name = "ETA",nullable= true)
    private LocalDateTime eta;

    /** Off-Block time — actual moment the aircraft pushes back from the gate. Maps to MV column OFF_BLOCK_TIME. */
    @Column(name = "OFF_BLOCK_TIME")
    private LocalDateTime offBlock;

    /** Airborne time — actual moment of takeoff (wheels off). Maps to MV column AIRBORNE_TIME. */
    @Column(name = "AIRBORNE_TIME")
    private LocalDateTime airborne;

    /** Landing time — actual moment of touchdown (wheels on). Maps to MV column LANDING_TIME. */
    @Column(name = "LANDING_TIME")
    private LocalDateTime landing;

    /** On-Block time — actual moment the aircraft reaches the arrival gate. Maps to MV column ON_BLOCK_TIME. */
    @Column(name = "ON_BLOCK_TIME")
    private LocalDateTime onBlock;

    /** The leg this flight time record belongs to. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "LEG_NO", referencedColumnName = "LEG_NO")
    private Leg leg;
}
