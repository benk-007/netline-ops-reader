package com.ram.netline_reader_backend.provider;

import com.ram.netline_reader_backend.dto.LegResponseDTO;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Abstraction layer for flight leg data access.
 * The service layer ({@code LegServiceImpl}) only depends on this interface,
 * making it profile-agnostic. No {@code if (dev)} logic anywhere.
 */
public interface LegDataProvider {

    Optional<LegResponseDTO> findByLegNo(Long legNo);

    List<LegResponseDTO> findByDate(LocalDate date);

    List<LegResponseDTO> findByDateRange(LocalDate startDate, LocalDate endDate);

    List<LegResponseDTO> findByFlightNumberAndDate(String flightNumber, LocalDate date);

    List<LegResponseDTO> findByDepartureAirportAndDate(String iataCode, LocalDate date);

    List<LegResponseDTO> findByArrivalAirportAndDate(String iataCode, LocalDate date);

    List<LegResponseDTO> findByAircraftAndDate(String registration, LocalDate date);

    List<LegResponseDTO> search(String flightNumber,
                                String departureAirport,
                                String arrivalAirport,
                                String aircraftRegistration,
                                String legType,
                                LocalDate date);
}
