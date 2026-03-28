package com.ram.netline_reader_backend.service.impl;

import com.ram.netline_reader_backend.dto.LegResponseDTO;
import com.ram.netline_reader_backend.entity.User;
import com.ram.netline_reader_backend.event.MvRefreshEvent;
import com.ram.netline_reader_backend.exception.ResourceNotFoundException;
import com.ram.netline_reader_backend.provider.LegDataProvider;
import com.ram.netline_reader_backend.service.LegService;
import com.ram.netline_reader_backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.context.event.EventListener;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Single implementation of {@link LegService} — profile-agnostic.
 *
 * Data access is delegated to {@link LegDataProvider}, which is swapped
 * by Spring based on the active profile:
 *   dev  → {@code FakeLegDataProvider} (PostgreSQL fake MV)
 *   prod → {@code OracleLegDataProvider} (real Oracle MV)
 *
 * Two cross-cutting concerns are handled here:
 *
 * 1. Caching — all query results are cached. Caches are evicted automatically
 *    when a {@link MvRefreshEvent} is published (MV data changed).
 *
 * 2. Station scope — if the authenticated caller has the {@code chef_escale} role,
 *    results are filtered to legs where dep or arr matches their {@code assignedAirport}.
 *    This enforcement happens at the service layer so it applies to every query method.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LegServiceImpl implements LegService {

    private static final String ROLE_CHEF_ESCALE = "ROLE_chef_escale";

    private final LegDataProvider legDataProvider;
    private final UserService userService;

    // ── Queries (results cached and station-scoped) ─────────────────────

    @Override
    @Cacheable(value = "legs", key = "#legNo")
    public LegResponseDTO getLegByLegNo(Long legNo) {
        LegResponseDTO leg = legDataProvider.findByLegNo(legNo)
                .orElseThrow(() -> new ResourceNotFoundException("Leg not found: " + legNo));

        // Station managers must not access legs outside their station
        if (!passesStationScope(leg)) {
            throw new ResourceNotFoundException("Leg not found: " + legNo);
        }
        return leg;
    }

    @Override
    @Cacheable(value = "legsByDate", key = "#date")
    public List<LegResponseDTO> getLegsByDate(LocalDate date) {
        return applyStationScope(legDataProvider.findByDate(date));
    }

    @Override
    @Cacheable(value = "legsByDateRange", key = "#startDate + '-' + #endDate")
    public List<LegResponseDTO> getLegsByDateRange(LocalDate startDate, LocalDate endDate) {
        return applyStationScope(legDataProvider.findByDateRange(startDate, endDate));
    }

    @Override
    @Cacheable(value = "legsByFlight", key = "#flightNumber + '-' + #date")
    public List<LegResponseDTO> getLegsByFlightNumberAndDate(String flightNumber, LocalDate date) {
        return applyStationScope(legDataProvider.findByFlightNumberAndDate(flightNumber, date));
    }

    @Override
    @Cacheable(value = "legsByDeparture", key = "#iataCode + '-' + #date")
    public List<LegResponseDTO> getLegsByDepartureAirportAndDate(String iataCode, LocalDate date) {
        return applyStationScope(legDataProvider.findByDepartureAirportAndDate(iataCode, date));
    }

    @Override
    @Cacheable(value = "legsByArrival", key = "#iataCode + '-' + #date")
    public List<LegResponseDTO> getLegsByArrivalAirportAndDate(String iataCode, LocalDate date) {
        return applyStationScope(legDataProvider.findByArrivalAirportAndDate(iataCode, date));
    }

    @Override
    @Cacheable(value = "legsByAircraft", key = "#registration + '-' + #date")
    public List<LegResponseDTO> getLegsByAircraftAndDate(String registration, LocalDate date) {
        return applyStationScope(legDataProvider.findByAircraftAndDate(registration, date));
    }

    @Override
    @Cacheable(value = "legsSearch",
               key = "(#flightNumber ?: '') + '-' + (#departureAirport ?: '') + '-' + " +
                     "(#arrivalAirport ?: '') + '-' + (#aircraftRegistration ?: '') + '-' + " +
                     "(#legService ?: '') + '-' + (#date ?: '')")
    public List<LegResponseDTO> searchLegs(String flightNumber, String departureAirport,
                                            String arrivalAirport, String aircraftRegistration,
                                            String legService, LocalDate date) {
        return applyStationScope(legDataProvider.search(
                flightNumber, departureAirport, arrivalAirport,
                aircraftRegistration, legService, date));
    }

    // ── Cache eviction on MV refresh ─────────────────────────────────────

    @EventListener
    @Caching(evict = {
            @CacheEvict(value = "legs",             allEntries = true),
            @CacheEvict(value = "legsByDate",        allEntries = true),
            @CacheEvict(value = "legsByDateRange",   allEntries = true),
            @CacheEvict(value = "legsByFlight",      allEntries = true),
            @CacheEvict(value = "legsByDeparture",   allEntries = true),
            @CacheEvict(value = "legsByArrival",     allEntries = true),
            @CacheEvict(value = "legsByAircraft",    allEntries = true),
            @CacheEvict(value = "legsSearch",        allEntries = true)
    })
    public void onMvRefresh(MvRefreshEvent event) {
        log.info("[Cache] Evicted all leg caches after MV refresh ({} records changed)",
                event.getChangedCount());
    }

    // ── Station-scope filtering ───────────────────────────────────────────

    /**
     * Filters a list of legs to those touching the caller's assigned airport.
     * Returns the list unchanged if the caller is not a station manager
     * or if no assigned airport is configured.
     */
    private List<LegResponseDTO> applyStationScope(List<LegResponseDTO> legs) {
        return resolveStationAirport()
                .map(airport -> legs.stream()
                        .filter(l -> airportMatches(l, airport))
                        .collect(Collectors.toList()))
                .orElse(legs);
    }

    /**
     * Checks a single leg against the station scope.
     * Used for the single-leg lookup where filtering-by-list is not possible.
     */
    private boolean passesStationScope(LegResponseDTO leg) {
        return resolveStationAirport()
                .map(airport -> airportMatches(leg, airport))
                .orElse(true);
    }

    /**
     * Resolves the station airport for the current authenticated user.
     * Returns empty if:
     *   - the caller is not a station manager
     *   - the user has no assignedAirport configured
     */
    private Optional<String> resolveStationAirport() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return Optional.empty();

        boolean isStationManager = auth.getAuthorities().stream()
                .anyMatch(a -> ROLE_CHEF_ESCALE.equals(a.getAuthority()));
        if (!isStationManager) return Optional.empty();

        try {
            User user = userService.getUserByKeycloakId(auth.getName());
            String airport = user.getAssignedAirport();
            if (airport == null || airport.isBlank()) {
                log.warn("[StationScope] Station manager keycloakId={} has no assignedAirport — returning all legs",
                        auth.getName());
                return Optional.empty();
            }
            return Optional.of(airport.toUpperCase());
        } catch (Exception e) {
            log.warn("[StationScope] Could not resolve station manager user — returning all legs: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private static boolean airportMatches(LegResponseDTO leg, String airport) {
        return airport.equals(iataOf(leg.getDepartureAirport()))
            || airport.equals(iataOf(leg.getArrivalAirport()));
    }

    private static String iataOf(LegResponseDTO.AirportDTO a) {
        return (a != null && a.getIataCode() != null) ? a.getIataCode().toUpperCase() : "";
    }
}
