package com.ram.netline_reader_backend.entity.oracle;

import jakarta.persistence.*;
import lombok.*;

/**
 * Aircraft reference data — the physical aircraft assigned to fly a leg.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  DATA SOURCE: Oracle materialized view — READ-ONLY                 │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * The primary key is the aircraft registration (tail number),
 * e.g. "CN-RGT" for a Royal Air Maroc Boeing 787.
 *
 * Relationship with Leg:
 *   - Each leg is operated by one aircraft.
 *   - An aircraft can operate many legs (across different days/times).
 */
@Entity
@Table(name = "MV_AIRCRAFT")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Aircraft {

    /** Aircraft registration / tail number (e.g. "CN-RGT"). */
    @Id
    @Column(name = "REGISTRATION")
    private String registration;

    /** Aircraft subtype (e.g. "B737-800", "B787-9", "ATR72-600"). */
    @Column(name = "SUB_TYPE")
    private String subType;

    /** Maximum takeoff weight in kilograms. */
    @Column(name = "MAX_WEIGHT")
    private Double maxWeight;

    /** Maximum cargo capacity in kilograms. */
    @Column(name = "CARGO_CAPACITY")
    private Double cargoCapacity;
}
