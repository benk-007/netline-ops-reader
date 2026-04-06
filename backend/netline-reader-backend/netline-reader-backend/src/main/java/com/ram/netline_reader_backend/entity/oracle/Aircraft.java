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

    /** Aircraft registration / tail number (e.g. "CN-RGT"). Maps to MV column AC_REGISTRATION. */
    @Id
    @Column(name = "AC_REGISTRATION")
    private String registration;

    /** Aircraft subtype (e.g. "B737-800", "B787-9", "ATR72-600"). Maps to MV column AC_SUBTYPE. */
    @Column(name = "AC_SUBTYPE")
    private String subType;

    /** Aircraft owner / operator code (e.g. "RAM"). Maps to MV column AC_OWNER. */
    @Column(name = "AC_OWNER")
    private String owner;

    /** Aircraft configuration version (e.g. "WINGLET"). Maps to MV column AC_VERSION. */
    @Column(name = "AC_VERSION")
    private String version;

    /** Maximum takeoff weight in kilograms. */
    @Column(name = "MAX_WEIGHT")
    private Double maxWeight;

    /** Maximum cargo capacity in kilograms. */
    @Column(name = "CARGO_CAPACITY", nullable = true)
    private Double cargoCapacity;
}
