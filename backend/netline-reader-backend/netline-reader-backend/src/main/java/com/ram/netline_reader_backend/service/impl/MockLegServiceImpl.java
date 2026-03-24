package com.ram.netline_reader_backend.service.impl;

import com.ram.netline_reader_backend.dto.LegResponseDTO;
import com.ram.netline_reader_backend.exception.ResourceNotFoundException;
import com.ram.netline_reader_backend.service.LegService;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

/**
 * Mock implementation of {@link LegService} — used when Oracle is not available.
 *
 * Activated when {@code app.oracle.enabled} is false (the default).
 * Returns empty results so the backend starts without an Oracle connection.
 * The frontend uses its own mock data for display.
 */
@Service
@ConditionalOnProperty(name = "app.oracle.enabled", havingValue = "false", matchIfMissing = true)
public class MockLegServiceImpl implements LegService {

    @Override
    public LegResponseDTO getLegByLegNo(Long legNo) {
        throw new ResourceNotFoundException("Leg not found (Oracle disabled) — legNo: " + legNo);
    }

    @Override
    public List<LegResponseDTO> getLegsByDate(LocalDate date) {
        return Collections.emptyList();
    }

    @Override
    public List<LegResponseDTO> getLegsByDateRange(LocalDate startDate, LocalDate endDate) {
        return Collections.emptyList();
    }

    @Override
    public List<LegResponseDTO> getLegsByFlightNumberAndDate(String flightNumber, LocalDate date) {
        return Collections.emptyList();
    }

    @Override
    public List<LegResponseDTO> getLegsByDepartureAirportAndDate(String iataCode, LocalDate date) {
        return Collections.emptyList();
    }

    @Override
    public List<LegResponseDTO> getLegsByArrivalAirportAndDate(String iataCode, LocalDate date) {
        return Collections.emptyList();
    }

    @Override
    public List<LegResponseDTO> getLegsByAircraftAndDate(String registration, LocalDate date) {
        return Collections.emptyList();
    }

    @Override
    public List<LegResponseDTO> searchLegs(String flightNumber,
                                            String departureAirport,
                                            String arrivalAirport,
                                            String aircraftRegistration,
                                            String legService,
                                            LocalDate date) {
        return Collections.emptyList();
    }
}
