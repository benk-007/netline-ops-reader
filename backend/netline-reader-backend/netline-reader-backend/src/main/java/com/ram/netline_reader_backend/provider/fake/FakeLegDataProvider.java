package com.ram.netline_reader_backend.provider.fake;

import com.ram.netline_reader_backend.dto.LegResponseDTO;
import com.ram.netline_reader_backend.entity.fake.LegMv;
import com.ram.netline_reader_backend.provider.LegDataProvider;
import com.ram.netline_reader_backend.repository.fake.LegMvRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Development implementation of {@link LegDataProvider}.
 *
 * Reads flight leg data from the {@code leg_mv} PostgreSQL table, which is
 * a flat simulation of the Oracle materialized views. Data is kept fresh
 * by {@link FakeMvRefreshJob} which runs every 3 minutes.
 *
 * Active only on the {@code dev} profile — the real Oracle provider
 * ({@code OracleLegDataProvider}) is used in production.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
@Transactional(value = "postgresTransactionManager", readOnly = true)
public class FakeLegDataProvider implements LegDataProvider {

    private final LegMvRepository legMvRepository;

    @Override
    public Optional<LegResponseDTO> findByLegNo(Long legNo) {
        Optional<LegResponseDTO> result = legMvRepository.findById(legNo).map(this::toDto);
        log.debug("[FakeProvider] findByLegNo({}) → {}", legNo, result.isPresent() ? "found" : "not found");
        return result;
    }

    @Override
    public List<LegResponseDTO> findByDate(LocalDate date) {
        List<LegResponseDTO> result = legMvRepository.findByOperationalDate(date).stream()
                .map(this::toDto).collect(Collectors.toList());
        log.debug("[FakeProvider] findByDate({}) → {} legs", date, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> findByDateRange(LocalDate startDate, LocalDate endDate) {
        List<LegResponseDTO> result = legMvRepository.findByOperationalDateBetween(startDate, endDate).stream()
                .map(this::toDto).collect(Collectors.toList());
        log.debug("[FakeProvider] findByDateRange({} → {}) → {} legs", startDate, endDate, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> findByFlightNumberAndDate(String flightNumber, LocalDate date) {
        List<LegResponseDTO> result = legMvRepository.findByFlightNumberAndOperationalDate(flightNumber, date).stream()
                .map(this::toDto).collect(Collectors.toList());
        log.debug("[FakeProvider] findByFlightNumberAndDate({}, {}) → {} legs", flightNumber, date, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> findByDepartureAirportAndDate(String iataCode, LocalDate date) {
        List<LegResponseDTO> result = legMvRepository
                .findByDepAirportCodeAndOperationalDate(iataCode.toUpperCase(), date).stream()
                .map(this::toDto).collect(Collectors.toList());
        log.debug("[FakeProvider] findByDepartureAirportAndDate({}, {}) → {} legs", iataCode, date, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> findByArrivalAirportAndDate(String iataCode, LocalDate date) {
        List<LegResponseDTO> result = legMvRepository
                .findByArrAirportCodeAndOperationalDate(iataCode.toUpperCase(), date).stream()
                .map(this::toDto).collect(Collectors.toList());
        log.debug("[FakeProvider] findByArrivalAirportAndDate({}, {}) → {} legs", iataCode, date, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> findByAircraftAndDate(String registration, LocalDate date) {
        List<LegResponseDTO> result = legMvRepository
                .findByAircraftRegistrationAndOperationalDate(registration.toUpperCase(), date).stream()
                .map(this::toDto).collect(Collectors.toList());
        log.debug("[FakeProvider] findByAircraftAndDate({}, {}) → {} legs", registration, date, result.size());
        return result;
    }

    @Override
    public List<LegResponseDTO> search(String flightNumber, String departureAirport,
                                       String arrivalAirport, String aircraftRegistration,
                                       String legType, LocalDate date) {
        Specification<LegMv> spec = buildSpec(flightNumber, departureAirport, arrivalAirport,
                aircraftRegistration, legType, date);
        List<LegResponseDTO> result = legMvRepository.findAll(spec).stream()
                .map(this::toDto).collect(Collectors.toList());
        log.debug("[FakeProvider] search(fn={}, dep={}, arr={}, ac={}, type={}, date={}) → {} legs",
                flightNumber, departureAirport, arrivalAirport, aircraftRegistration, legType, date, result.size());
        return result;
    }

    // ── Specification builder ─────────────────────────────────────────────

    private Specification<LegMv> buildSpec(String flightNumber, String departureAirport,
                                            String arrivalAirport, String aircraftRegistration,
                                            String legType, LocalDate date) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (date != null) {
                predicates.add(cb.equal(root.get("operationalDate"), date));
            }
            if (flightNumber != null && !flightNumber.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("flightNumber")), flightNumber.toUpperCase()));
            }
            if (departureAirport != null && !departureAirport.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("depAirportCode")), departureAirport.toUpperCase()));
            }
            if (arrivalAirport != null && !arrivalAirport.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("arrAirportCode")), arrivalAirport.toUpperCase()));
            }
            if (aircraftRegistration != null && !aircraftRegistration.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("aircraftRegistration")), aircraftRegistration.toUpperCase()));
            }
            if (legType != null && !legType.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("legType")), legType.toUpperCase()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    // ── DTO mapping ───────────────────────────────────────────────────────

    private LegResponseDTO toDto(LegMv leg) {
        return LegResponseDTO.builder()
                .legNo(leg.getLegNo())
                .flightNumber(leg.getFlightNumber())
                .carrierCode(leg.getCarrierCode())
                .operationalDate(leg.getOperationalDate())
                .legState(leg.getLegState())
                .legType(leg.getLegType())
                .delayDuration(leg.getDelayDuration())
                .criticalDelay(leg.isCriticalDelay())
                .flightTime(LegResponseDTO.FlightTimeDTO.builder()
                        .std(leg.getStd()).sta(leg.getSta())
                        .etd(leg.getEtd()).eta(leg.getEta())
                        .offBlock(leg.getOffBlock()).airborne(leg.getAirborne())
                        .landing(leg.getLanding()).onBlock(leg.getOnBlock())
                        .build())
                .flightLoad(LegResponseDTO.FlightLoadDTO.builder()
                        .paxBooked(leg.getPaxBooked()).paxFlown(leg.getPaxFlown())
                        .paxBusiness(leg.getPaxBusiness()).paxEconomy(leg.getPaxEconomy())
                        .cargoWeight(leg.getCargoWeight()).baggageWeight(leg.getBaggageWeight())
                        .build())
                .delays(leg.getDelays().stream()
                        .map(d -> LegResponseDTO.DelayDTO.builder()
                                .code(d.getCode())
                                .duration(d.getDuration())
                                .description(d.getDescription())
                                .build())
                        .collect(Collectors.toList()))
                .departureAirport(LegResponseDTO.AirportDTO.builder()
                        .iataCode(leg.getDepAirportCode()).fullName(leg.getDepAirportName())
                        .timeZone(leg.getDepTimezone()).latitude(leg.getDepLatitude())
                        .longitude(leg.getDepLongitude())
                        .build())
                .arrivalAirport(LegResponseDTO.AirportDTO.builder()
                        .iataCode(leg.getArrAirportCode()).fullName(leg.getArrAirportName())
                        .timeZone(leg.getArrTimezone()).latitude(leg.getArrLatitude())
                        .longitude(leg.getArrLongitude())
                        .build())
                .aircraft(LegResponseDTO.AircraftDTO.builder()
                        .registration(leg.getAircraftRegistration())
                        .subType(leg.getAircraftSubType())
                        .maxWeight(leg.getAircraftMaxWeight())
                        .cargoCapacity(leg.getAircraftCargoCapacity())
                        .build())
                .build();
    }
}
