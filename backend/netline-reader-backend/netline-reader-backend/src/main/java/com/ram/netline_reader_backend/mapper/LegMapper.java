package com.ram.netline_reader_backend.mapper;

import com.ram.netline_reader_backend.dto.LegResponseDTO;
import com.ram.netline_reader_backend.entity.oracle.*;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.stream.Collectors;

/**
 * Maps {@link Leg} Oracle entities to {@link LegResponseDTO} for the API response.
 *
 * This mapper aggregates data from all related entities (FlightTime, FlightLoad,
 * Delay, Airport, Aircraft) into a single flat DTO — so the frontend gets
 * everything it needs in one API call.
 *
 * All mappings are null-safe: if a relationship is missing (e.g. no aircraft
 * assigned yet), the corresponding DTO field will be null.
 */
@Component
public class LegMapper {

    /**
     * Converts a Leg entity (with all its relationships) to a full response DTO.
     *
     * @param leg the Leg entity loaded from Oracle (may have lazy associations)
     * @return a fully populated LegResponseDTO
     */
    public LegResponseDTO toResponseDTO(Leg leg) {
        return LegResponseDTO.builder()
                // Core leg fields
                .legNo(leg.getLegNo())
                .flightNumber(leg.getFlightNumber())
                .carrierCode(leg.getCarrierCode())
                .operationalDate(leg.getOperationalDate())
                .legState(leg.getLegState())
                .legType(leg.getLegType())

                // Computed fields
                .delayDuration(leg.getDelayDuration())
                .criticalDelay(leg.isCriticalDelay())

                // Nested objects (null-safe)
                .flightTime(mapFlightTime(leg.getFlightTime()))
                .flightLoad(mapFlightLoad(leg.getFlightLoad()))
                .delays(mapDelays(leg))
                .departureAirport(mapAirport(leg.getDepartureAirport()))
                .arrivalAirport(mapAirport(leg.getArrivalAirport()))
                .aircraft(mapAircraft(leg.getAircraft()))
                .build();
    }

    // ── Private mapping helpers ──────────────────────────────────────

    private LegResponseDTO.FlightTimeDTO mapFlightTime(FlightTime ft) {
        if (ft == null) return null;
        return LegResponseDTO.FlightTimeDTO.builder()
                .std(ft.getStd())
                .sta(ft.getSta())
                .etd(ft.getEtd())
                .eta(ft.getEta())
                .offBlock(ft.getOffBlock())
                .airborne(ft.getAirborne())
                .landing(ft.getLanding())
                .onBlock(ft.getOnBlock())
                .build();
    }

    private LegResponseDTO.FlightLoadDTO mapFlightLoad(FlightLoad fl) {
        if (fl == null) return null;
        return LegResponseDTO.FlightLoadDTO.builder()
                .paxBooked(fl.getPaxBooked())
                .paxFlown(fl.getPaxFlown())
                .paxBusiness(fl.getPaxBusiness())
                .paxEconomy(fl.getPaxEconomy())
                .cargoWeight(fl.getCargoWeight())
                .baggageWeight(fl.getBaggageWeight())
                .build();
    }

    private java.util.List<LegResponseDTO.DelayDTO> mapDelays(Leg leg) {
        if (leg.getDelays() == null || leg.getDelays().isEmpty()) {
            return Collections.emptyList();
        }
        return leg.getDelays().stream()
                .map(d -> LegResponseDTO.DelayDTO.builder()
                        .code(d.getCode())
                        .duration(d.getDuration())
                        .description(d.getDescription())
                        .build())
                .collect(Collectors.toList());
    }

    private LegResponseDTO.AirportDTO mapAirport(Airport airport) {
        if (airport == null) return null;
        return LegResponseDTO.AirportDTO.builder()
                .iataCode(airport.getIataCode())
                .fullName(airport.getFullName())
                .timeZone(airport.getTimeZone())
                .latitude(airport.getLatitude())
                .longitude(airport.getLongitude())
                .build();
    }

    private LegResponseDTO.AircraftDTO mapAircraft(Aircraft aircraft) {
        if (aircraft == null) return null;
        return LegResponseDTO.AircraftDTO.builder()
                .registration(aircraft.getRegistration())
                .subType(aircraft.getSubType())
                .maxWeight(aircraft.getMaxWeight())
                .cargoCapacity(aircraft.getCargoCapacity())
                .build();
    }
}
