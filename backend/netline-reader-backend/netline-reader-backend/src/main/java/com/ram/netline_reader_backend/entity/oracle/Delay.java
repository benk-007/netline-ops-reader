package com.ram.netline_reader_backend.entity.oracle;

import jakarta.persistence.*;
import lombok.*;

/**
 * Delay record — a single delay code applied to a flight leg.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  DATA SOURCE: Oracle materialized view — READ-ONLY                 │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * A leg can have zero or more delay records. Each delay has:
 *   - code        → IATA standard delay code (e.g. "81" = ATFM restriction)
 *   - duration    → delay duration in minutes
 *   - description → human-readable reason (e.g. "ATC en-route delay")
 *
 * The total delay for a leg is the sum of all its delay durations.
 * See {@link Leg#getDelayDuration()} and {@link Leg#isCriticalDelay()}.
 */
@Entity
@Table(name = "MV_DELAY")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Delay {

    @Id
    @Column(name = "ID")
    private Long id;

    /** IATA delay code (e.g. "81", "93", "15"). */
    @Column(name = "CODE")
    private String code;

    /** Delay duration in minutes. */
    @Column(name = "DURATION")
    private Integer duration;

    /** Human-readable description of the delay reason. */
    @Column(name = "DESCRIPTION")
    private String description;

    /** The leg this delay is charged against. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "LEG_NO", referencedColumnName = "LEG_NO")
    private Leg leg;
}
