package com.ram.netline_reader_backend.entity.oracle;

import jakarta.persistence.*;
import lombok.*;

/**
 * Flight load record — passenger counts and cargo/baggage weights for a leg.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  DATA SOURCE: Oracle materialized view — READ-ONLY                 │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Passenger figures:
 *   - paxBooked  = "Total réservé"  (total reservations, may include no-shows)
 *   - paxFlown   = "Total réel à bord" (actual passengers who boarded)
 *   - paxBusiness / paxEconomy = cabin class breakdown
 *
 * Cargo figures:
 *   - cargoWeight   = weight of freight/cargo in kg
 *   - baggageWeight = weight of passenger baggage in kg
 *
 * Composition: each FlightLoad belongs to exactly one {@link Leg}.
 */
@Entity
@Table(name = "MV_FLIGHT_LOAD")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlightLoad {

    @Id
    @Column(name = "ID", nullable = true)
    @GeneratedValue(strategy = GenerationType.IDENTITY)    
    private Long id;

    /** Total reserved passengers (booked, may include no-shows). */
    @Column(name = "PAX_BOOKED", nullable = true)
    private Integer paxBooked;

    /** Actual passengers on board (after boarding closes). */
    @Column(name = "PAX_FLOWN" ,nullable = true)
    private Integer paxFlown;

    /** Business class passenger count. */
    @Column(name = "PAX_BUSINESS" ,nullable = true)
    private Integer paxBusiness;

    /** Economy class passenger count. */
    @Column(name = "PAX_ECONOMY" ,nullable = true)
    private Integer paxEconomy;

    /** Cargo (freight) weight in kilograms. */
    @Column(name = "CARGO_WEIGHT", nullable = true)
    private Double cargoWeight;

    /** Passenger baggage weight in kilograms. */
    @Column(name = "BAGGAGE_WEIGHT", nullable = true)
    private Double baggageWeight;

    /** The leg this load record belongs to. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "LEG_NO", referencedColumnName = "LEG_NO", nullable = true)
    private Leg leg;
}
