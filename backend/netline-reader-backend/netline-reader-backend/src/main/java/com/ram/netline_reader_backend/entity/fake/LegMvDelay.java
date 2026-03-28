package com.ram.netline_reader_backend.entity.fake;

import jakarta.persistence.*;
import lombok.*;

/**
 * Delay record for a simulated leg in the dev fake MV.
 * Mirrors the Oracle {@code MV_DELAY} view structure.
 */
@Entity
@Table(name = "leg_mv_delay")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LegMvDelay {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "leg_mv_delay_seq")
    @SequenceGenerator(name = "leg_mv_delay_seq", sequenceName = "leg_mv_delay_seq", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leg_no", nullable = false)
    private LegMv legMv;

    /** IATA delay code (e.g. "93" = aircraft late arriving). */
    @Column(name = "code", length = 5)
    private String code;

    /** Delay duration in minutes. */
    @Column(name = "duration")
    private Integer duration;

    /** Human-readable description. */
    @Column(name = "description")
    private String description;
}
