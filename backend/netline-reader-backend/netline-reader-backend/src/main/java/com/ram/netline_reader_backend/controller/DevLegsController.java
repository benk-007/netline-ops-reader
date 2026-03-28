package com.ram.netline_reader_backend.controller;

import com.ram.netline_reader_backend.dto.LegResponseDTO;
import com.ram.netline_reader_backend.service.LegService;
import com.ram.netline_reader_backend.service.MvRefreshSseService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Dev-only controller that mirrors the leg API without requiring a JWT token.
 *
 * Available only when {@code spring.profiles.active=dev}.
 * Useful for rapid local testing with curl, Postman, or a browser —
 * without needing a running Keycloak instance.
 *
 * Base path: /dev/legs  (mapped as permitAll in SecurityConfig)
 *
 * NEVER active in prod — the @Profile("dev") annotation ensures this class
 * is not instantiated in production builds.
 */
@RestController
@RequestMapping("/dev/legs")
@Profile("dev")
@RequiredArgsConstructor
public class DevLegsController {

    private final LegService legService;
    private final MvRefreshSseService sseService;

    /** All legs for a given date (defaults to today). */
    @GetMapping
    public ResponseEntity<List<LegResponseDTO>> getByDate(
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().toString()}")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(legService.getLegsByDate(date));
    }

    /** Single leg by leg number. */
    @GetMapping("/{legNo}")
    public ResponseEntity<LegResponseDTO> getOne(@PathVariable Long legNo) {
        return ResponseEntity.ok(legService.getLegByLegNo(legNo));
    }

    /** Date range query. */
    @GetMapping("/range")
    public ResponseEntity<List<LegResponseDTO>> getRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(legService.getLegsByDateRange(start, end));
    }

    /** Dynamic search — all params optional. */
    @GetMapping("/search")
    public ResponseEntity<List<LegResponseDTO>> search(
            @RequestParam(required = false) String flightNumber,
            @RequestParam(required = false) String departureAirport,
            @RequestParam(required = false) String arrivalAirport,
            @RequestParam(required = false) String aircraftRegistration,
            @RequestParam(required = false) String legService,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(this.legService.searchLegs(
                flightNumber, departureAirport, arrivalAirport,
                aircraftRegistration, legService, date));
    }

    /** SSE stream — sends a "mv-refresh" event whenever the fake MV data changes. */
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events() {
        return sseService.subscribe();
    }

    /** Health-check: shows active SSE connections and today's leg count. */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        int todayCount = legService.getLegsByDate(LocalDate.now()).size();
        return ResponseEntity.ok(Map.of(
                "profile",            "dev",
                "todayLegs",          todayCount,
                "sseConnections",     sseService.getActiveConnectionCount(),
                "date",               LocalDate.now().toString()
        ));
    }
}
