package com.ram.netline_reader_backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

/**
 * Request payload for creating or updating a saved filter profile.
 * Requires a name and the owning user's ID; filter arrays are optional.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedFilterRequestDTO {

    @NotBlank(message = "Filter name is required")
    private String name;

    /** Departure airport IATA codes (optional). */
    private List<String> depAirport;

    /** Arrival airport IATA codes (optional). */
    private List<String> arrAirport;

    /** Service type codes (optional). */
    private List<String> serviceType;

    /** Aircraft subtype codes (optional). */
    private List<String> aircraftType;

    /** Flight numbers (optional). */
    private List<String> flightNumber;
}
