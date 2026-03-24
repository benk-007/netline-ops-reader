package com.ram.netline_reader_backend.service.impl;

import com.ram.netline_reader_backend.dto.LegResponseDTO;
import com.ram.netline_reader_backend.entity.oracle.Leg;
import com.ram.netline_reader_backend.exception.ResourceNotFoundException;
import com.ram.netline_reader_backend.mapper.LegMapper;
import com.ram.netline_reader_backend.repository.oracle.LegRepository;
import com.ram.netline_reader_backend.service.LegService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of {@link LegService} — reads flight data from Oracle.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  ALL METHODS ARE READ-ONLY.                                        │
 * │  We use the "oracleTransactionManager" to ensure queries go to     │
 * │  the Oracle datasource, not PostgreSQL.                            │
 * │  readOnly=true tells the JDBC driver to optimize for SELECT.       │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Entity graphs / fetch joins:
 *   Leg relationships (FlightTime, FlightLoad, Delay, Airport, Aircraft)
 *   are LAZY by default. When we map a Leg to a DTO, the mapper accesses
 *   all relationships — triggering lazy-loading within the same transaction.
 *   If performance becomes an issue, consider adding @EntityGraph or
 *   JPQL fetch joins to load everything in a single query.
 */
@Service
@RequiredArgsConstructor
@Transactional(value = "oracleTransactionManager", readOnly = true)
public class LegServiceImpl implements LegService {

    private final LegRepository legRepository;
    private final LegMapper legMapper;

    @Override
    public LegResponseDTO getLegByLegNo(Long legNo) {
        Leg leg = legRepository.findById(legNo)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Leg not found with legNo: " + legNo));
        return legMapper.toResponseDTO(leg);
    }

    @Override
    public List<LegResponseDTO> getLegsByDate(LocalDate date) {
        return legRepository.findByOperationalDate(date).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegResponseDTO> getLegsByDateRange(LocalDate startDate, LocalDate endDate) {
        return legRepository.findByOperationalDateBetween(startDate, endDate).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegResponseDTO> getLegsByFlightNumberAndDate(String flightNumber, LocalDate date) {
        return legRepository.findByFlightNumberAndOperationalDate(flightNumber, date).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegResponseDTO> getLegsByDepartureAirportAndDate(String iataCode, LocalDate date) {
        return legRepository.findByDepartureAirportAndDate(iataCode, date).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegResponseDTO> getLegsByArrivalAirportAndDate(String iataCode, LocalDate date) {
        return legRepository.findByArrivalAirportAndDate(iataCode, date).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegResponseDTO> getLegsByAircraftAndDate(String registration, LocalDate date) {
        return legRepository.findByAircraftAndDate(registration, date).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }
}
