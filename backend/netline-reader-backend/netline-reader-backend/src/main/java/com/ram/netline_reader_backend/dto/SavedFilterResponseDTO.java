package com.ram.netline_reader_backend.dto;

import lombok.*;

import java.util.List;

/**
 * Response payload for a saved filter profile.
 * Returned when listing or creating filters.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedFilterResponseDTO {

    private Long id;
    private String name;
    private List<String> depAirport;
    private List<String> arrAirport;
    private List<String> serviceType;
    private List<String> aircraftType;
    private List<String> flightNumber;
}
