package com.ram.netline_reader_backend.provider;

import com.ram.netline_reader_backend.dto.LegResponseDTO;
import com.ram.netline_reader_backend.entity.oracle.Aircraft;
import com.ram.netline_reader_backend.entity.oracle.Airport;
import com.ram.netline_reader_backend.entity.oracle.Leg;
import com.ram.netline_reader_backend.entity.oracle.MvLegRow;
import com.ram.netline_reader_backend.mapper.LegMapper;
import com.ram.netline_reader_backend.mapper.MvLegMapper;
import com.ram.netline_reader_backend.repository.oracle.AircraftRepository;
import com.ram.netline_reader_backend.repository.oracle.AirportRepository;
import com.ram.netline_reader_backend.repository.oracle.MvLegRowRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Production implementation of {@link LegDataProvider}.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  DATA FLOW (prod path)                                              │
 * │                                                                      │
 * │  Oracle flat MV                                                      │
 * │    ↓  MvLegRowRepository  (native Oracle query → MvLegRow POJOs)   │
 * │  MvLegRow  (flat, every column from the Oracle MV)                  │
 * │    ↓  MvLegMapper.toEntity()                                        │
 * │  Leg  (rich structured graph with Aircraft, Airport, FlightTime…)   │
 * │    ↓  Airport/Aircraft enrichment (batch lookup from ref tables)    │
 * │  Leg  (airports and aircraft populated from MV_AIRPORT / MV_AIRCRAFT)│
 * │    ↓  LegMapper.toResponseDTO()                                     │
 * │  LegResponseDTO  (API payload)                                      │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Enrichment strategy:
 *   MvLegMapper builds minimal Airport/Aircraft stubs (IATA code / registration
 *   only). Before mapping to DTOs, this provider batch-fetches all referenced
 *   airports and aircraft from their dedicated Oracle reference views in a single
 *   query each, then replaces the stubs with the enriched entities. This avoids
 *   N+1 queries while keeping MvLegMapper free of database dependencies.
 *
 * Active only on the {@code prod} profile — never instantiated in dev.
 * All queries are read-only and run within the Oracle transaction manager.
 */
@Component
@Profile("prod")
@RequiredArgsConstructor
@Slf4j
@Transactional(value = "oracleTransactionManager", readOnly = true)
public class OracleLegDataProvider implements LegDataProvider {

    private final MvLegRowRepository mvLegRowRepository;
    private final MvLegMapper        mvLegMapper;
    private final LegMapper          legMapper;
    private final AirportRepository  airportRepository;
    private final AircraftRepository aircraftRepository;

    @PersistenceContext(unitName = "oracle")
    private EntityManager entityManager;

    // ── LegDataProvider implementation ──────────────────────────────────

    @Override
    public Optional<LegResponseDTO> findByLegNo(Long legNo) {
        Optional<LegResponseDTO> result = mvLegRowRepository.findById(legNo)
                .map(row -> mapRows(List.of(row)).get(0));
        log.debug("[OracleProvider] findByLegNo({}) → {}", legNo, result.isPresent() ? "found" : "not found");
        return result;
    }

    @Override
    public List<LegResponseDTO> findByDate(LocalDate date) {
        List<LegResponseDTO> result = mapRows(mvLegRowRepository.findByDayOfOrigin(date));
        log.debug("[OracleProvider] findByDate({}) → {} legs", date, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> findByDateRange(LocalDate startDate, LocalDate endDate) {
        List<LegResponseDTO> result = mapRows(mvLegRowRepository.findByDayOfOriginBetween(startDate, endDate));
        log.debug("[OracleProvider] findByDateRange({} → {}) → {} legs", startDate, endDate, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> findByFlightNumberAndDate(String flightNumber, LocalDate date) {
        List<LegResponseDTO> result = mapRows(mvLegRowRepository.findByFlightNumberAndDate(flightNumber, date));
        log.debug("[OracleProvider] findByFlightNumberAndDate({}, {}) → {} legs", flightNumber, date, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> findByDepartureAirportAndDate(String iataCode, LocalDate date) {
        List<LegResponseDTO> result = mapRows(mvLegRowRepository.findByDepApSchedAndDayOfOrigin(iataCode, date));
        log.debug("[OracleProvider] findByDepartureAirportAndDate({}, {}) → {} legs", iataCode, date, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> findByArrivalAirportAndDate(String iataCode, LocalDate date) {
        List<LegResponseDTO> result = mapRows(mvLegRowRepository.findByArrApSchedAndDayOfOrigin(iataCode, date));
        log.debug("[OracleProvider] findByArrivalAirportAndDate({}, {}) → {} legs", iataCode, date, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> findByAircraftAndDate(String registration, LocalDate date) {
        List<LegResponseDTO> result = mapRows(mvLegRowRepository.findByAcRegistrationAndDayOfOrigin(registration, date));
        log.debug("[OracleProvider] findByAircraftAndDate({}, {}) → {} legs", registration, date, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> search(String flightNumber, String departureAirport,
                                       String arrivalAirport, String aircraftRegistration,
                                       String legType, LocalDate date) {
        CriteriaBuilder         cb    = entityManager.getCriteriaBuilder();
        CriteriaQuery<MvLegRow> query = cb.createQuery(MvLegRow.class);
        Root<MvLegRow>          row   = query.from(MvLegRow.class);

        List<Predicate> predicates = new ArrayList<>();

        // Flight number: MV stores carrier + number separately; concatenate for comparison
        if (flightNumber != null && !flightNumber.isBlank()) {
            Expression<String> fullFn = cb.concat(
                    cb.upper(row.get("fnCarrier")),
                    cb.upper(row.get("fnNumber")));
            predicates.add(cb.equal(fullFn, flightNumber.toUpperCase()));
        }
        if (departureAirport != null && !departureAirport.isBlank()) {
            predicates.add(cb.equal(cb.upper(row.get("depApSched")), departureAirport.toUpperCase()));
        }
        if (arrivalAirport != null && !arrivalAirport.isBlank()) {
            predicates.add(cb.equal(cb.upper(row.get("arrApSched")), arrivalAirport.toUpperCase()));
        }
        if (aircraftRegistration != null && !aircraftRegistration.isBlank()) {
            predicates.add(cb.equal(cb.upper(row.get("acRegistration")), aircraftRegistration.toUpperCase()));
        }
        if (date != null) {
            predicates.add(cb.equal(row.get("dayOfOrigin"), date));
        }
        if (legType != null && !legType.isBlank()) {
            predicates.add(cb.equal(cb.upper(row.get("legType")), legType.toUpperCase()));
        }

        query.where(predicates.toArray(Predicate[]::new));
        List<MvLegRow> rows = entityManager.createQuery(query).getResultList();
        List<LegResponseDTO> result = mapRows(rows);
        log.debug("[OracleProvider] search(fn={}, dep={}, arr={}, ac={}, type={}, date={}) → {} legs",
                flightNumber, departureAirport, arrivalAirport, aircraftRegistration, legType, date, result.size());
        return result;
    }

    // ── Core mapping pipeline ────────────────────────────────────────────

    /**
     * Maps a batch of flat MV rows into response DTOs.
     *
     * Steps:
     *   1. Collect all unique IATA codes referenced by this result set.
     *   2. Collect all unique aircraft registrations referenced.
     *   3. Batch-fetch enriched Airport and Aircraft entities (2 queries total).
     *   4. For each row: MvLegMapper → Leg, enrich airports/aircraft, LegMapper → DTO.
     *
     * @param rows flat MvLegRow records from the Oracle MV query
     * @return list of fully populated LegResponseDTO objects
     */
    private List<LegResponseDTO> mapRows(List<MvLegRow> rows) {
        if (rows == null || rows.isEmpty()) return Collections.emptyList();

        // Collect all IATA codes appearing in this result set (dep/arr, sched/actual)
        Set<String> iatas = rows.stream()
                .flatMap(r -> Stream.of(r.getDepApSched(), r.getArrApSched(),
                                        r.getDepApActual(), r.getArrApActual()))
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.toSet());

        // Collect all aircraft registrations
        Set<String> registrations = rows.stream()
                .map(MvLegRow::getAcRegistration)
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.toSet());

        // Batch-fetch reference data (1 query each — no N+1)
        Map<String, Airport> airportMap = airportRepository.findAllById(iatas).stream()
                .collect(Collectors.toMap(Airport::getIataCode, Function.identity()));

        Map<String, Aircraft> aircraftMap = aircraftRepository.findAllById(registrations).stream()
                .collect(Collectors.toMap(Aircraft::getRegistration, Function.identity()));

        return rows.stream()
                .map(row -> {
                    Leg leg = mvLegMapper.toEntity(row);
                    enrichLeg(leg, row, airportMap, aircraftMap);
                    return legMapper.toResponseDTO(leg);
                })
                .collect(Collectors.toList());
    }

    /**
     * Replaces the minimal Airport/Aircraft stubs created by MvLegMapper with the
     * fully enriched entities loaded from Oracle reference tables.
     *
     * Falls back to the mapper-built stub when the reference table does not contain
     * the IATA code / registration (so the IATA code is still available in the DTO).
     */
    private void enrichLeg(Leg leg, MvLegRow row,
                            Map<String, Airport> airportMap,
                            Map<String, Aircraft> aircraftMap) {
        if (row.getDepApSched() != null && airportMap.containsKey(row.getDepApSched())) {
            leg.setDepartureAirport(airportMap.get(row.getDepApSched()));
        }
        if (row.getArrApSched() != null && airportMap.containsKey(row.getArrApSched())) {
            leg.setArrivalAirport(airportMap.get(row.getArrApSched()));
        }
        if (row.getDepApActual() != null && airportMap.containsKey(row.getDepApActual())) {
            leg.setActualDepartureAirport(airportMap.get(row.getDepApActual()));
        }
        if (row.getArrApActual() != null && airportMap.containsKey(row.getArrApActual())) {
            leg.setActualArrivalAirport(airportMap.get(row.getArrApActual()));
        }
        if (row.getAcRegistration() != null && aircraftMap.containsKey(row.getAcRegistration())) {
            leg.setAircraft(aircraftMap.get(row.getAcRegistration()));
        }
    }
}
