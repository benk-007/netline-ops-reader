package com.ram.netline_reader_backend.controller;

import com.ram.netline_reader_backend.dto.LegResponseDTO;
import com.ram.netline_reader_backend.service.LegService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * REST controller for flight leg data — READ-ONLY endpoints.
 *
 * All data is sourced from Oracle materialized views.
 * There are no POST/PUT/DELETE endpoints because we never
 * modify leg data — it flows from Netline OPS → Oracle MV → this API.
 *
 * Endpoints:
 *   GET /api/legs/{legNo}               — single leg by ID
 *   GET /api/legs?date=2026-03-19       — all legs for a date (Gantt view)
 *   GET /api/legs/range?start=...&end=... — legs in a date range
 *   GET /api/legs/by-flight?flightNumber=AT205&date=2026-03-19
 *   GET /api/legs/by-departure?airport=CMN&date=2026-03-19
 *   GET /api/legs/by-arrival?airport=CDG&date=2026-03-19
 *   GET /api/legs/by-aircraft?registration=CN-RGT&date=2026-03-19
 *
 * All endpoints require authentication (enforced by SecurityConfig).
 */
@RestController
@RequestMapping("/api/legs")
@RequiredArgsConstructor
public class LegController {

    private final LegService legService;

    /**
     * Get a single leg with full details (times, load, delays, airports, aircraft).
     *
     * @param legNo the unique leg identifier
     */
    @GetMapping("/{legNo}")
    public ResponseEntity<LegResponseDTO> getLeg(@PathVariable Long legNo) {
        return ResponseEntity.ok(legService.getLegByLegNo(legNo));
    }

    /**
     * Get all legs for a specific date — the primary Gantt chart query.
     *
     * @param date operational date in ISO format (YYYY-MM-DD)
     */
    @GetMapping
    public ResponseEntity<List<LegResponseDTO>> getLegsByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(legService.getLegsByDate(date));
    }

    /**
     * Get all legs within an inclusive date range.
     *
     * @param start range start date (YYYY-MM-DD)
     * @param end   range end date (YYYY-MM-DD)
     */
    @GetMapping("/range")
    public ResponseEntity<List<LegResponseDTO>> getLegsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(legService.getLegsByDateRange(start, end));
    }

    /**
     * Get legs for a specific flight number on a given date.
     *
     * @param flightNumber e.g. "AT205"
     * @param date         operational date
     */
    @GetMapping("/by-flight")
    public ResponseEntity<List<LegResponseDTO>> getLegsByFlight(
            @RequestParam String flightNumber,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(legService.getLegsByFlightNumberAndDate(flightNumber, date));
    }

    /**
     * Get all legs departing from a specific airport on a given date.
     *
     * @param airport 3-letter IATA code (e.g. "CMN")
     * @param date    operational date
     */
    @GetMapping("/by-departure")
    public ResponseEntity<List<LegResponseDTO>> getLegsByDeparture(
            @RequestParam String airport,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(legService.getLegsByDepartureAirportAndDate(airport, date));
    }

    /**
     * Get all legs arriving at a specific airport on a given date.
     *
     * @param airport 3-letter IATA code (e.g. "CDG")
     * @param date    operational date
     */
    @GetMapping("/by-arrival")
    public ResponseEntity<List<LegResponseDTO>> getLegsByArrival(
            @RequestParam String airport,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(legService.getLegsByArrivalAirportAndDate(airport, date));
    }

    /**
     * Get all legs operated by a specific aircraft on a given date.
     * Shows the aircraft's full rotation/schedule for the day.
     *
     * @param registration tail number (e.g. "CN-RGT")
     * @param date         operational date
     */
    @GetMapping("/by-aircraft")
    public ResponseEntity<List<LegResponseDTO>> getLegsByAircraft(
            @RequestParam String registration,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(legService.getLegsByAircraftAndDate(registration, date));
    }
}
