package com.ram.netline_reader_backend.service;

import com.ram.netline_reader_backend.dto.LegResponseDTO;

import java.time.LocalDate;
import java.util.List;

/**
 * Service interface for flight leg operations — READ-ONLY.
 *
 * All leg data comes from Oracle materialized views and is never
 * modified by this application. This service provides query methods
 * that map directly to the Gantt chart and schedule views in the frontend.
 *
 * Implementations must use the Oracle transaction manager and
 * mark all methods as read-only transactions.
 */
public interface LegService {

    /**
     * Get a single leg by its unique leg number.
     *
     * @param legNo the unique leg identifier from Oracle
     * @return the leg with all nested data (times, load, delays, airports, aircraft)
     * @throws com.ram.netline_reader_backend.exception.ResourceNotFoundException if not found
     */
    LegResponseDTO getLegByLegNo(Long legNo);

    /**
     * Get all legs for a specific operational date.
     * This is the primary query for the Gantt chart day view.
     *
     * @param date the operational date (e.g. 2026-03-19)
     * @return all legs scheduled for that date, with full nested data
     */
    List<LegResponseDTO> getLegsByDate(LocalDate date);

    /**
     * Get all legs within a date range (inclusive on both ends).
     * Used for multi-day schedule views and reporting.
     *
     * @param startDate range start (inclusive)
     * @param endDate   range end (inclusive)
     * @return all legs within the range
     */
    List<LegResponseDTO> getLegsByDateRange(LocalDate startDate, LocalDate endDate);

    /**
     * Get all legs for a specific flight number on a given date.
     *
     * @param flightNumber e.g. "AT205"
     * @param date         the operational date
     * @return matching legs (usually 1, but could be more for multi-leg flights)
     */
    List<LegResponseDTO> getLegsByFlightNumberAndDate(String flightNumber, LocalDate date);

    /**
     * Get all legs departing from a specific airport on a given date.
     *
     * @param iataCode the 3-letter IATA airport code (e.g. "CMN")
     * @param date     the operational date
     * @return all departing legs from that airport
     */
    List<LegResponseDTO> getLegsByDepartureAirportAndDate(String iataCode, LocalDate date);

    /**
     * Get all legs arriving at a specific airport on a given date.
     *
     * @param iataCode the 3-letter IATA airport code (e.g. "CDG")
     * @param date     the operational date
     * @return all arriving legs at that airport
     */
    List<LegResponseDTO> getLegsByArrivalAirportAndDate(String iataCode, LocalDate date);

    /**
     * Get all legs operated by a specific aircraft on a given date.
     * Useful for viewing a single aircraft's rotation/schedule.
     *
     * @param registration the aircraft registration / tail number (e.g. "CN-RGT")
     * @param date         the operational date
     * @return all legs operated by that aircraft
     */
    List<LegResponseDTO> getLegsByAircraftAndDate(String registration, LocalDate date);
}
