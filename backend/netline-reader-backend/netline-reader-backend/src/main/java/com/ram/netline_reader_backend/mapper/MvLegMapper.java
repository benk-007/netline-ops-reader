package com.ram.netline_reader_backend.mapper;

import com.ram.netline_reader_backend.entity.oracle.Aircraft;
import com.ram.netline_reader_backend.entity.oracle.Airport;
import com.ram.netline_reader_backend.entity.oracle.Delay;
import com.ram.netline_reader_backend.entity.oracle.FlightLoad;
import com.ram.netline_reader_backend.entity.oracle.FlightTime;
import com.ram.netline_reader_backend.entity.oracle.Leg;
import com.ram.netline_reader_backend.entity.oracle.MvLegRow;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Maps a flat {@link MvLegRow} (one row from the Oracle Netline MV) into the
 * structured entity graph used by the rest of the application.
 *
 * Responsibilities:
 *   - Combine split date + time fields from the MV into {@link LocalDateTime}
 *   - Compose the commercial flight identifier (FN_CARRIER + FN_NUMBER + FN_SUFFIX)
 *   - Denormalize the three flat delay slots into a {@link List} of {@link Delay}
 *   - Populate {@link FlightLoad#getPaxBooked()} from the PRBD column
 *   - Set bidirectional back-references (flightTime.leg, flightLoad.leg, delay.leg)
 *
 * Airport enrichment (fullName, timeZone, city, lat/lon) is NOT performed here —
 * those fields come from a separate reference table (MV_AIRPORT) and are resolved
 * by the repository layer via the IATA code FK.
 */
@Component
public class MvLegMapper {

    /**
     * Converts a flat MV row into a fully populated {@link Leg} entity with all
     * its composed sub-entities.
     *
     * @param row a non-null row from the Oracle Netline materialized view
     * @return a Leg entity ready to use in the service layer
     */
    public Leg toEntity(MvLegRow row) {
 
        Aircraft aircraft = buildAircraft(row);
        Airport depSched   = airportRef(row.getDepApSched());
        Airport arrSched   = airportRef(row.getArrApSched());
        Airport depActual  = airportRef(row.getDepApActual());
        Airport arrActual  = airportRef(row.getArrApActual());
        FlightTime flightTime = buildFlightTime(row);
        FlightLoad flightLoad = buildFlightLoad(row);
        List<Delay> delays    = buildDelays(row);

        Leg leg = Leg.builder()
                .legNo(row.getLegNo())
                .updateKey(row.getUpdateKey())
                .flightNumber(row.getFnNumber())
                .carrierCode(row.getFnCarrier())
                .fnSuffix(row.getFnSuffix())
                .operationalDate(row.getDayOfOrigin())
                .changeTime(row.getChangeTime())
                .entryUser(row.getEntryUser())
                .legState(row.getLegState())
                .legType(row.getLegType())
                .aircraft(aircraft)
                .departureAirport(depSched)
                .arrivalAirport(arrSched)
                .actualDepartureAirport(depActual)
                .actualArrivalAirport(arrActual)
                .flightTime(flightTime)
                .flightLoad(flightLoad)
                .delays(delays)
                .build();

        // Maintain bidirectional references
        if (flightTime != null) flightTime.setLeg(leg);
        if (flightLoad != null) flightLoad.setLeg(leg);
        delays.forEach(d -> d.setLeg(leg));

        return leg;
    }

    // ── Private builders ─────────────────────────────────────────────────

    private Aircraft buildAircraft(MvLegRow row) {
        if (row.getAcRegistration() == null) return null;
        return Aircraft.builder()
                .registration(row.getAcRegistration())
                .subType(row.getAcSubtype())
                .owner(row.getAcOwner())
                .version(row.getAcVersion())
                .build();
    }

    /**
     * Creates a minimal Airport reference containing only the IATA code.
     * The remaining fields (fullName, timeZone, etc.) are resolved by JPA
     * when the entity is fetched via the FK join to MV_AIRPORT.
     *
     * Returns null when iataCode is null or blank (avoids orphan references).
     */
    private Airport airportRef(String iataCode) {
        if (iataCode == null || iataCode.isBlank()) return null;
        return Airport.builder().iataCode(iataCode).build();
    }

    private FlightTime buildFlightTime(MvLegRow row) {
        return FlightTime.builder()
                // Scheduled times: combine date + time from the MV
                .std(combine(row.getDepDaySched(), row.getDepTimeSched()))
                .sta(combine(row.getArrDaySched(), row.getArrTimeSched()))
                // ETD / ETA are not provided by the MV; left null (derived elsewhere)
                .etd(null)
                .eta(null)
                // OOOI actual times: departure-side events on the departure day,
                // arrival-side events on the arrival day
                .offBlock(combine(row.getDepDaySched(), row.getOffBlockTime()))
                .airborne(combine(row.getDepDaySched(), row.getAirborneTime()))
                .landing(combine(row.getArrDaySched(), row.getLandingTime()))
                .onBlock(combine(row.getArrDaySched(), row.getOnBlockTime()))
                .build();
    }

    private FlightLoad buildFlightLoad(MvLegRow row) {
        // MV provides only PRBD (pax booked); all other load fields come from
        // a different source and are left null.
        return FlightLoad.builder()
                .paxBooked(row.getPrbd())
                .build();
    }

    /**
     * Expands the three flat delay slots into a list of {@link Delay} objects.
     * Slots with a null code are skipped. IDs are synthesised as
     * {@code legNo * 10 + slotIndex} (deterministic, collision-free per leg).
     */
    private List<Delay> buildDelays(MvLegRow row) {
        List<Delay> delays = new ArrayList<>();
        if (row.getDelayCode01() != null) {
            delays.add(Delay.builder()
                    .id(row.getLegNo() * 10 + 1)
                    .code(row.getDelayCode01())
                    .duration(row.getDelayTime01())
                    .build());
        }
        if (row.getDelayCode02() != null) {
            delays.add(Delay.builder()
                    .id(row.getLegNo() * 10 + 2)
                    .code(row.getDelayCode02())
                    .duration(row.getDelayTime02())
                    .build());
        }
        if (row.getDelayCode03() != null) {
            delays.add(Delay.builder()
                    .id(row.getLegNo() * 10 + 3)
                    .code(row.getDelayCode03())
                    .duration(row.getDelayTime03())
                    .build());
        }
        return delays;
    }

    /**
     * Combines a date and a time into a {@link LocalDateTime}.
     * Returns null if either argument is null (field not yet populated in MV).
     */
    private LocalDateTime combine(LocalDate date, LocalTime time) {
        if (date == null || time == null) return null;
        return LocalDateTime.of(date, time);
    }
}
