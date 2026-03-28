package com.ram.netline_reader_backend.provider;

import com.ram.netline_reader_backend.dto.LegResponseDTO;
import com.ram.netline_reader_backend.entity.oracle.Aircraft;
import com.ram.netline_reader_backend.entity.oracle.Airport;
import com.ram.netline_reader_backend.entity.oracle.Leg;
import com.ram.netline_reader_backend.mapper.LegMapper;
import com.ram.netline_reader_backend.repository.oracle.LegRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Production implementation of {@link LegDataProvider}.
 *
 * Reads flight leg data from the real Oracle Materialized Views.
 * Active only on the {@code prod} profile — never instantiated in dev.
 *
 * All queries are read-only and use the Oracle transaction manager.
 */
@Component
@Profile("prod")
@RequiredArgsConstructor
@Transactional(value = "oracleTransactionManager", readOnly = true)
public class OracleLegDataProvider implements LegDataProvider {

    private final LegRepository legRepository;
    private final LegMapper legMapper;

    @PersistenceContext(unitName = "oracleEntityManagerFactory")
    private EntityManager entityManager;

    @Override
    public Optional<LegResponseDTO> findByLegNo(Long legNo) {
        return legRepository.findById(legNo).map(legMapper::toResponseDTO);
    }

    @Override
    public List<LegResponseDTO> findByDate(LocalDate date) {
        return legRepository.findByOperationalDate(date).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegResponseDTO> findByDateRange(LocalDate startDate, LocalDate endDate) {
        return legRepository.findByOperationalDateBetween(startDate, endDate).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegResponseDTO> findByFlightNumberAndDate(String flightNumber, LocalDate date) {
        return legRepository.findByFlightNumberAndOperationalDate(flightNumber, date).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegResponseDTO> findByDepartureAirportAndDate(String iataCode, LocalDate date) {
        return legRepository.findByDepartureAirportAndDate(iataCode, date).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegResponseDTO> findByArrivalAirportAndDate(String iataCode, LocalDate date) {
        return legRepository.findByArrivalAirportAndDate(iataCode, date).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegResponseDTO> findByAircraftAndDate(String registration, LocalDate date) {
        return legRepository.findByAircraftAndDate(registration, date).stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<LegResponseDTO> search(String flightNumber, String departureAirport,
                                       String arrivalAirport, String aircraftRegistration,
                                       String legType, LocalDate date) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Leg> cq = cb.createQuery(Leg.class);
        Root<Leg> leg = cq.from(Leg.class);

        List<Predicate> predicates = new ArrayList<>();

        if (flightNumber != null && !flightNumber.isBlank()) {
            predicates.add(cb.equal(cb.upper(leg.get("flightNumber")), flightNumber.toUpperCase()));
        }
        if (departureAirport != null && !departureAirport.isBlank()) {
            Join<Leg, Airport> dep = leg.join("departureAirport");
            predicates.add(cb.equal(cb.upper(dep.get("iataCode")), departureAirport.toUpperCase()));
        }
        if (arrivalAirport != null && !arrivalAirport.isBlank()) {
            Join<Leg, Airport> arr = leg.join("arrivalAirport");
            predicates.add(cb.equal(cb.upper(arr.get("iataCode")), arrivalAirport.toUpperCase()));
        }
        if (aircraftRegistration != null && !aircraftRegistration.isBlank()) {
            Join<Leg, Aircraft> ac = leg.join("aircraft");
            predicates.add(cb.equal(cb.upper(ac.get("registration")), aircraftRegistration.toUpperCase()));
        }
        if (date != null) {
            predicates.add(cb.equal(leg.get("operationalDate"), date));
        }
        if (legType != null && !legType.isBlank()) {
            predicates.add(cb.equal(cb.upper(leg.get("legType")), legType.toUpperCase()));
        }

        cq.where(predicates.toArray(new Predicate[0])).distinct(true);
        return entityManager.createQuery(cq).getResultList().stream()
                .map(legMapper::toResponseDTO)
                .collect(Collectors.toList());
    }
}
