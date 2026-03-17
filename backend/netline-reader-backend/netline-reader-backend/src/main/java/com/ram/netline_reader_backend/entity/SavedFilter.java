package com.ram.netline_reader_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * A saved filter profile belonging to a {@link User}.
 *
 * Stores a named set of filter criteria (airports, service types, aircraft
 * types, flight numbers) so the user can quickly reload a customised Gantt
 * view without re-entering every filter manually.
 *
 * Each filter list is stored in a separate collection table to support
 * multi-value selections.
 */
@Entity
@Table(name = "saved_filters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedFilter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Human-readable profile name (e.g. "CMN matin"). */
    @Column(nullable = false)
    private String name;

    /** Departure airport IATA codes filter. */
    @ElementCollection
    @CollectionTable(name = "saved_filter_dep_airports", joinColumns = @JoinColumn(name = "saved_filter_id"))
    @Column(name = "dep_airport")
    @Builder.Default
    private List<String> depAirport = new ArrayList<>();

    /** Arrival airport IATA codes filter. */
    @ElementCollection
    @CollectionTable(name = "saved_filter_arr_airports", joinColumns = @JoinColumn(name = "saved_filter_id"))
    @Column(name = "arr_airport")
    @Builder.Default
    private List<String> arrAirport = new ArrayList<>();

    /** Service type codes filter (PAX, Cargo, Ferry, etc.). */
    @ElementCollection
    @CollectionTable(name = "saved_filter_service_types", joinColumns = @JoinColumn(name = "saved_filter_id"))
    @Column(name = "service_type")
    @Builder.Default
    private List<String> serviceType = new ArrayList<>();

    /** Aircraft subtype filter (B737-800, ATR72-600, etc.). */
    @ElementCollection
    @CollectionTable(name = "saved_filter_aircraft_types", joinColumns = @JoinColumn(name = "saved_filter_id"))
    @Column(name = "aircraft_type")
    @Builder.Default
    private List<String> aircraftType = new ArrayList<>();

    /** Flight number filter. */
    @ElementCollection
    @CollectionTable(name = "saved_filter_flight_numbers", joinColumns = @JoinColumn(name = "saved_filter_id"))
    @Column(name = "flight_number")
    @Builder.Default
    private List<String> flightNumber = new ArrayList<>();

    /** Owning user — cascade delete when user is removed. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
