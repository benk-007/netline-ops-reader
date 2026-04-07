package com.ram.netline_reader_backend.provider;

import com.ram.netline_reader_backend.dto.LegResponseDTO;
import com.ram.netline_reader_backend.enrichment.AircraftEnrichmentSource;
import com.ram.netline_reader_backend.enrichment.AirportEnrichmentSource;
import com.ram.netline_reader_backend.enrichment.StaticAircraftEnrichmentSource;
import com.ram.netline_reader_backend.entity.oracle.Aircraft;
import com.ram.netline_reader_backend.entity.oracle.Airport;
import com.ram.netline_reader_backend.entity.oracle.Leg;
import com.ram.netline_reader_backend.entity.oracle.MvLegRow;
import com.ram.netline_reader_backend.mapper.LegMapper;
import com.ram.netline_reader_backend.mapper.MvLegMapper;
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
import java.util.Optional;

/**
 * Production implementation of {@link LegDataProvider}.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  DATA FLOW (prod path)                                                   │
 * │                                                                          │
 * │  Oracle flat MV                                                          │
 * │    ↓  MvLegRowRepository  (native Oracle query → MvLegRow POJOs)       │
 * │  MvLegRow  (flat, every column from the Oracle MV)                      │
 * │    ↓  MvLegMapper.toEntity()                                            │
 * │  Leg  (rich structured graph — airports/aircraft are stubs at this point)│
 * │    ↓  enrichLeg()  — static in-memory lookup (no DB calls)              │
 * │  Leg  (airports and aircraft populated from StaticXxxEnrichmentSource)  │
 * │    ↓  LegMapper.toResponseDTO()                                         │
 * │  LegResponseDTO  (API payload)                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Enrichment strategy (no N+1, no reference-table queries):
 *   MvLegMapper builds minimal Airport stubs (IATA code only) and minimal
 *   Aircraft stubs (registration / subType / owner / version from the MV).
 *   {@link #enrichLeg} then replaces these stubs with fully populated objects
 *   sourced from the static in-memory registries:
 *
 *     • {@link AirportEnrichmentSource}  → adds fullName, city, timeZone, lat/lon
 *     • {@link AircraftEnrichmentSource} → adds maxWeight, cargoCapacity
 *       (with a subType-level fallback for unknown registrations)
 *
 *   If a code/registration is absent from the static registry the original
 *   MV-provided stub is kept — the response is degraded but never broken.
 *
 * Swapping the enrichment source:
 *   Both sources are injected as interfaces.  To move to a real database or
 *   external API, implement the interface and register it as a Spring bean —
 *   no changes required here.
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

    private final MvLegRowRepository       mvLegRowRepository;
    private final MvLegMapper              mvLegMapper;
    private final LegMapper                legMapper;
    private final AirportEnrichmentSource  airportEnrichmentSource;
    private final AircraftEnrichmentSource aircraftEnrichmentSource;

    @PersistenceContext(unitName = "oracle")
    private EntityManager entityManager;

    // ── LegDataProvider implementation ───────────────────────────────────

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

    // ── Core mapping pipeline ─────────────────────────────────────────────

    /**
     * Maps a batch of flat MV rows into response DTOs.
     *
     * Steps (per row — no bulk DB look-ups needed with static enrichment):
     *   1. MvLegMapper.toEntity()  — builds Leg with minimal stubs
     *   2. enrichLeg()             — replaces stubs from in-memory registries
     *   3. LegMapper.toResponseDTO() — produces the API payload
     *
     * @param rows flat MvLegRow records from the Oracle MV query
     * @return list of fully populated LegResponseDTO objects
     */
    private List<LegResponseDTO> mapRows(List<MvLegRow> rows) {
        if (rows == null || rows.isEmpty()) return Collections.emptyList();

        return rows.stream()
                .map(row -> {
                    Leg leg = mvLegMapper.toEntity(row);
                    enrichLeg(leg, row);
                    return legMapper.toResponseDTO(leg);
                })
                .toList();
    }

    // ── Enrichment ────────────────────────────────────────────────────────

    /**
     * Replaces the minimal Airport / Aircraft stubs created by {@link MvLegMapper}
     * with fully populated objects from the static in-memory registries.
     *
     * Airport enrichment:
     *   Looks up each IATA code (dep/arr, sched/actual) in
     *   {@link AirportEnrichmentSource}.  Adds fullName, city, timeZone,
     *   latitude, longitude.  Falls back to the IATA-only stub on a miss.
     *
     * Aircraft enrichment:
     *   Primary:  exact registration match in {@link AircraftEnrichmentSource}
     *             → replaces the whole stub with the fully enriched record.
     *   Fallback: subType-level template from
     *             {@link StaticAircraftEnrichmentSource#findBySubType}
     *             → merges only maxWeight / cargoCapacity into the MV stub,
     *             preserving the registration / subType / owner / version
     *             that the MV already provides.
     *
     * @param leg the Leg entity to enrich in-place
     * @param row the source MV row (provides codes for look-up keys)
     */
    private void enrichLeg(Leg leg, MvLegRow row) {

        // ── Airports ──────────────────────────────────────────────────────
        enrichAirport(row.getDepApSched(),   leg::setDepartureAirport);
        enrichAirport(row.getArrApSched(),   leg::setArrivalAirport);
        enrichAirport(row.getDepApActual(),  leg::setActualDepartureAirport);
        enrichAirport(row.getArrApActual(),  leg::setActualArrivalAirport);

        // ── Aircraft ──────────────────────────────────────────────────────
        if (row.getAcRegistration() != null) {
            aircraftEnrichmentSource.findByRegistration(row.getAcRegistration())
                    .ifPresentOrElse(
                            // Full registration hit — replace the entire stub
                            leg::setAircraft,
                            // No exact hit — try subType fallback to fill weight/capacity
                            () -> mergeAircraftWeightFallback(leg, row)
                    );
        }
    }

    /**
     * Replaces the airport stub on the given setter only when the static registry
     * has a match — otherwise the MV-provided IATA-only stub is kept unchanged.
     *
     * @param iataCode IATA code from the MV row (may be null)
     * @param setter   method reference to the Leg setter for this airport slot
     */
    private void enrichAirport(String iataCode, java.util.function.Consumer<Airport> setter) {
        if (iataCode == null || iataCode.isBlank()) return;
        airportEnrichmentSource.findByIataCode(iataCode).ifPresent(setter);
    }

    /**
     * When the exact aircraft registration is not in the static registry, this
     * method attempts a subType-level look-up to at least fill in maxWeight and
     * cargoCapacity on the existing MV stub.
     *
     * The MV already provides registration / subType / owner / version, so we
     * build a merged Aircraft that keeps those fields and adds the weight data
     * from the subType template.
     *
     * @param leg the Leg whose aircraft stub should be enriched
     * @param row the MV row providing subType for the fallback look-up
     */
    private void mergeAircraftWeightFallback(Leg leg, MvLegRow row) {
        if (!(aircraftEnrichmentSource instanceof StaticAircraftEnrichmentSource staticSource)) return;
        if (row.getAcSubtype() == null) return;

        staticSource.findBySubType(row.getAcSubtype()).ifPresent(template -> {
            Aircraft existing = leg.getAircraft(); // stub from MvLegMapper
            if (existing == null) return;
            // Merge: keep MV fields, add weight/cargo from the type template
            leg.setAircraft(Aircraft.builder()
                    .registration(existing.getRegistration())
                    .subType(existing.getSubType())
                    .owner(existing.getOwner())
                    .version(existing.getVersion())
                    .maxWeight(template.getMaxWeight())
                    .cargoCapacity(template.getCargoCapacity())
                    .build());
        });
    }
}
