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

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Join;

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

    // dynamic search engine for our Gantt chart it supports multiple optional filters
    @Override
    public List<LegResponseDTO> searchLegs(String flightNumber,
                                       String departureAirport,
                                       String arrivalAirport,
                                       String aircraftRegistration,
                                       String legService,
                                       LocalDate date) {

    CriteriaBuilder cb = entityManager.getCriteriaBuilder();
    CriteriaQuery<Leg> cq = cb.createQuery(Leg.class);
    Root<Leg> leg = cq.from(Leg.class);

    List<Predicate> predicates = new ArrayList<>();

    if (flightNumber != null && !flightNumber.isEmpty()) {
        predicates.add(cb.equal(
                cb.upper(leg.get("flightNumber")),
                flightNumber.toUpperCase()
        ));
    }

    if (departureAirport != null && !departureAirport.isEmpty()) {
        Join<Leg, Airport> depAirport = leg.join("departureAirport");
        predicates.add(cb.equal(
                cb.upper(depAirport.get("iataCode")),
                departureAirport.toUpperCase()
        ));
    }

    if (arrivalAirport != null && !arrivalAirport.isEmpty()) {
        Join<Leg, Airport> arrAirport = leg.join("arrivalAirport");
        predicates.add(cb.equal(
                cb.upper(arrAirport.get("iataCode")),
                arrivalAirport.toUpperCase()
        ));
    }

    if (aircraftRegistration != null && !aircraftRegistration.isEmpty()) {
        Join<Leg, Aircraft> aircraftJoin = leg.join("aircraft");
        predicates.add(cb.equal(
                cb.upper(aircraftJoin.get("registration")),
                aircraftRegistration.toUpperCase()
        ));
    }

    if (date != null) {
        predicates.add(cb.equal(leg.get("operationalDate"), date));
    }

    if (legService != null && !legService.isEmpty()) {
        predicates.add(cb.equal(
                cb.upper(leg.get("legType")),
                legService.toUpperCase()
        ));
    }

    cq.where(predicates.toArray(new Predicate[0]));
    cq.distinct(true);
    // TODO : pagination
    List<Leg> results = entityManager.createQuery(cq).getResultList();

    return results.stream()
            .map(legMapper::legResponseDTO)
            .collect(Collectors.toList());
}


}
