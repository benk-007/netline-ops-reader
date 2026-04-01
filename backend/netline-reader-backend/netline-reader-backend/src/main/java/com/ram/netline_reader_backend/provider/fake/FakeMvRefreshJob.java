package com.ram.netline_reader_backend.provider.fake;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;
import java.util.zip.CRC32;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.ram.netline_reader_backend.entity.fake.LegMv;
import com.ram.netline_reader_backend.entity.fake.LegMvDelay;
import com.ram.netline_reader_backend.event.MvRefreshEvent;
import com.ram.netline_reader_backend.repository.fake.LegMvRepository;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * [DEV ONLY] Simulates an Oracle Materialized View refresh.
 *
 * On startup:  seeds {@code leg_mv} with a realistic Royal Air Maroc schedule
 *              covering today ±2 days (5-day rolling window).
 *
 * Every 3 min: advances leg states (SCHEDULED → BOARDING → AIRBORNE → LANDED → ARRIVED),
 *              randomly adds IATA delay codes, then publishes {@link MvRefreshEvent}
 *              only when actual data has changed (CRC32 checksum comparison).
 *
 * Fleet composition mirrors the real RAM network:
 *   - B787-9   (CN-RGT, CN-RBN)  — long-haul PAX + one dedicated Cargo rotation
 *   - B737 MAX 8 (CN-RGS, CN-ROC) — medium-haul PAX + North Africa + ferry
 *   - ATR72-600  (CN-ATU, CN-ATV) — domestic short-haul + positioning
 *
 * Leg types generated: J (PAX), F (Cargo), P (Positioning/Ferry), S (Charter).
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class FakeMvRefreshJob {

    private final LegMvRepository legMvRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final Random random = new Random();

    /** CRC32 of the last persisted state — used to skip no-op refreshes. */
    private long lastChecksum = -1L;

    // ═══════════════════════════════════════════════════════════════════════
    //  Static reference data
    // ═══════════════════════════════════════════════════════════════════════

    record AirportRef(String iata, String name, String tz, double lat, double lon) {}
    record AircraftRef(String reg, String type, double maxWeight, double cargoCapacity) {}

    /**
     * A scheduled flight template.
     *
     * @param flightNumber  AT-prefixed flight number
     * @param depIata       departure airport IATA code
     * @param arrIata       arrival airport IATA code
     * @param std           scheduled departure time (UTC, no date)
     * @param durationMin   block time in minutes
     * @param aircraftReg   tail number — must exist in {@link #FLEET}
     * @param legType       IATA leg type code: J=PAX, F=Cargo, P=Positioning, S=Charter
     * @param paxCapacity   total seat count (0 for pure cargo)
     * @param businessCap   business class seats (0 = mono-class or cargo)
     */
    record FlightTemplate(
            String flightNumber, String depIata, String arrIata,
            LocalTime std, int durationMin,
            String aircraftReg, String legType,
            int paxCapacity, int businessCap) {}

    private static final Map<String, AirportRef> AIRPORTS = Map.ofEntries(
            Map.entry("CMN", new AirportRef("CMN", "Casablanca Mohammed V",      "Africa/Casablanca",  33.3675,  -7.5898)),
            Map.entry("CDG", new AirportRef("CDG", "Paris Charles de Gaulle",    "Europe/Paris",       49.0097,   2.5479)),
            Map.entry("MAD", new AirportRef("MAD", "Madrid Barajas",             "Europe/Madrid",      40.4983,  -3.5676)),
            Map.entry("LHR", new AirportRef("LHR", "London Heathrow",            "Europe/London",      51.4775,  -0.4614)),
            Map.entry("FRA", new AirportRef("FRA", "Frankfurt International",    "Europe/Berlin",      50.0379,   8.5622)),
            Map.entry("BCN", new AirportRef("BCN", "Barcelona El Prat",          "Europe/Madrid",      41.2971,   2.0785)),
            Map.entry("BRU", new AirportRef("BRU", "Brussels Airport",           "Europe/Brussels",    50.9014,   4.4844)),
            Map.entry("RAK", new AirportRef("RAK", "Marrakech Menara",           "Africa/Casablanca",  31.6069,  -8.0363)),
            Map.entry("AGA", new AirportRef("AGA", "Agadir Al Massira",          "Africa/Casablanca",  30.3250,  -9.4130)),
            Map.entry("FEZ", new AirportRef("FEZ", "Fez-Saiss",                  "Africa/Casablanca",  33.9273,  -4.9779)),
            Map.entry("TUN", new AirportRef("TUN", "Tunis Carthage",             "Africa/Tunis",       36.8510,  10.2271)),
            Map.entry("ALG", new AirportRef("ALG", "Algiers Houari Boumediene",  "Africa/Algiers",     36.6910,   3.2154)),
            Map.entry("ORN", new AirportRef("ORN", "Oran Ahmed Ben Bella",       "Africa/Algiers",     35.6239,  -0.6212)),
            Map.entry("DXB", new AirportRef("DXB", "Dubai International",        "Asia/Dubai",         25.2528,  55.3644)),
            Map.entry("JFK", new AirportRef("JFK", "New York John F. Kennedy",   "America/New_York",   40.6413, -73.7781)),
            Map.entry("MRS", new AirportRef("MRS", "Marseille Provence",         "Europe/Paris",       43.4393,   5.2214))
    );

    private static final Map<String, AircraftRef> FLEET = Map.of(
            "CN-RGT", new AircraftRef("CN-RGT", "B787-9",     242000.0, 22000.0),
            "CN-RBN", new AircraftRef("CN-RBN", "B787-9",     242000.0, 22000.0),
            "CN-RGS", new AircraftRef("CN-RGS", "B737 MAX 8",  79016.0, 15000.0),
            "CN-ROC", new AircraftRef("CN-ROC", "B737 MAX 8",  79016.0, 15000.0),
            "CN-ATU", new AircraftRef("CN-ATU", "ATR72-600",   23000.0,  7500.0),
            "CN-ATV", new AircraftRef("CN-ATV", "ATR72-600",   23000.0,  7500.0)
    );

    /** IATA AHM delay codes used for simulation. */
    private static final List<String[]> DELAY_CODES = List.of(
            new String[]{"11", "Late passenger check-in"},
            new String[]{"16", "Commercial document / passenger processing"},
            new String[]{"41", "Aircraft rotation — late arrival of inbound flight"},
            new String[]{"61", "ATC ground delay"},
            new String[]{"71", "Late boarding — passenger handling"},
            new String[]{"81", "Operational requirement — crew"},
            new String[]{"93", "Aircraft late arriving from previous rotation"},
            new String[]{"96", "Reactionary delay from incoming flight"}
    );

    /**
     * Daily timetable: 32 legs covering PAX long/medium/short-haul,
     * cargo, charter, and positioning rotations.
     *
     * Leg type codes:
     *   J = Passenger (regular revenue service)
     *   F = Cargo (freight only, no pax)
     *   P = Positioning / Ferry (crew transfer, empty aircraft)
     *   S = Charter (non-scheduled PAX)
     */
    private static final List<FlightTemplate> SCHEDULE = List.of(

            // ── Long haul PAX — B787-9 ─────────────────────────────────────
            new FlightTemplate("AT201", "CMN", "CDG", LocalTime.of( 8, 30), 210, "CN-RGT", "J", 280, 20),
            new FlightTemplate("AT202", "CDG", "CMN", LocalTime.of(14, 30), 215, "CN-RGT", "J", 280, 20),
            new FlightTemplate("AT203", "CMN", "CDG", LocalTime.of(17, 15), 210, "CN-RBN", "J", 280, 20),
            new FlightTemplate("AT204", "CDG", "CMN", LocalTime.of( 7,  0), 220, "CN-RBN", "J", 280, 20),
            new FlightTemplate("AT221", "CMN", "LHR", LocalTime.of(10,  0), 240, "CN-RGT", "J", 280, 20),
            new FlightTemplate("AT222", "LHR", "CMN", LocalTime.of(15,  0), 235, "CN-RGT", "J", 280, 20),
            new FlightTemplate("AT701", "CMN", "DXB", LocalTime.of(23, 30), 420, "CN-RBN", "J", 280, 28),
            new FlightTemplate("AT702", "DXB", "CMN", LocalTime.of(10,  0), 430, "CN-RBN", "J", 280, 28),
            // New York transatlantic
            new FlightTemplate("AT200", "CMN", "JFK", LocalTime.of(13,  0), 510, "CN-RGT", "J", 280, 28),
            new FlightTemplate("AT199", "JFK", "CMN", LocalTime.of( 1,  0), 480, "CN-RGT", "J", 280, 28),

            // ── Medium haul PAX — B737 MAX 8 ──────────────────────────────
            new FlightTemplate("AT231", "CMN", "FRA", LocalTime.of( 9,  0), 270, "CN-RGS", "J", 162, 12),
            new FlightTemplate("AT232", "FRA", "CMN", LocalTime.of(15, 30), 260, "CN-RGS", "J", 162, 12),
            new FlightTemplate("AT211", "CMN", "MAD", LocalTime.of( 7,  0), 110, "CN-ROC", "J", 162, 12),
            new FlightTemplate("AT212", "MAD", "CMN", LocalTime.of(10, 15), 115, "CN-ROC", "J", 162, 12),
            new FlightTemplate("AT500", "CMN", "ALG", LocalTime.of(11,  0), 115, "CN-RGS", "J", 162, 12),
            new FlightTemplate("AT501", "ALG", "CMN", LocalTime.of(14, 30), 115, "CN-RGS", "J", 162, 12),
            new FlightTemplate("AT502", "CMN", "TUN", LocalTime.of(12, 30), 145, "CN-ROC", "J", 162, 12),
            new FlightTemplate("AT503", "TUN", "CMN", LocalTime.of(16,  0), 150, "CN-ROC", "J", 162, 12),
            new FlightTemplate("AT510", "CMN", "ORN", LocalTime.of( 8,  0), 120, "CN-RGS", "J", 162, 12),
            new FlightTemplate("AT511", "ORN", "CMN", LocalTime.of(11, 30), 125, "CN-RGS", "J", 162, 12),
            new FlightTemplate("AT241", "CMN", "BCN", LocalTime.of(14,  0), 140, "CN-ROC", "J", 162, 12),
            new FlightTemplate("AT242", "BCN", "CMN", LocalTime.of(18, 30), 140, "CN-ROC", "J", 162, 12),
            new FlightTemplate("AT251", "CMN", "BRU", LocalTime.of( 9, 30), 195, "CN-RGS", "J", 162, 12),
            new FlightTemplate("AT252", "BRU", "CMN", LocalTime.of(16,  0), 195, "CN-RGS", "J", 162, 12),
            new FlightTemplate("AT261", "CMN", "MRS", LocalTime.of(13, 30), 155, "CN-ROC", "J", 162, 12),
            new FlightTemplate("AT262", "MRS", "CMN", LocalTime.of(17, 30), 155, "CN-ROC", "J", 162, 12),

            // ── Domestic short haul PAX — ATR72-600 ───────────────────────
            new FlightTemplate("AT401", "CMN", "RAK", LocalTime.of( 6, 30),  60, "CN-ATU", "J",  72,  0),
            new FlightTemplate("AT402", "RAK", "CMN", LocalTime.of( 8,  0),  60, "CN-ATU", "J",  72,  0),
            new FlightTemplate("AT403", "CMN", "AGA", LocalTime.of( 7,  0),  80, "CN-ATV", "J",  72,  0),
            new FlightTemplate("AT404", "AGA", "CMN", LocalTime.of( 9,  0),  80, "CN-ATV", "J",  72,  0),
            new FlightTemplate("AT405", "CMN", "FEZ", LocalTime.of( 7, 30),  55, "CN-ATU", "J",  72,  0),
            new FlightTemplate("AT406", "FEZ", "CMN", LocalTime.of( 9,  0),  55, "CN-ATU", "J",  72,  0),

            // ── Cargo — B787-9 freighter rotation ─────────────────────────
            // CN-RBN repositions to CDG then operates a dedicated cargo turn
            new FlightTemplate("AT800", "CMN", "CDG", LocalTime.of( 2,  0), 210, "CN-RBN", "F",   0,  0),
            new FlightTemplate("AT801", "CDG", "CMN", LocalTime.of( 7,  0), 215, "CN-RBN", "F",   0,  0),

            // ── Charter — B737 MAX 8 weekend charter CMN↔BCN ─────────────
            new FlightTemplate("AT900", "CMN", "BCN", LocalTime.of(16,  0), 140, "CN-ROC", "S", 162,  0),
            new FlightTemplate("AT901", "BCN", "CMN", LocalTime.of(20, 30), 140, "CN-ROC", "S", 162,  0),

            // ── Positioning / Ferry — ATR after maintenance ────────────────
            // Aircraft ferried empty from RAK to CMN for maintenance cycle
            new FlightTemplate("AT950", "RAK", "CMN", LocalTime.of(22,  0),  60, "CN-ATV", "P",   0,  0)
    );

    // ═══════════════════════════════════════════════════════════════════════
    //  Startup seed
    // ═══════════════════════════════════════════════════════════════════════

    @PostConstruct
    @Transactional("postgresTransactionManager")
    public void initializeData() {
        log.info("[FakeMV] ── Seeding leg_mv (rolling ±2 day window, {} templates) ──", SCHEDULE.size());
        legMvRepository.deleteAll();

        LocalDate today = LocalDate.now();
        List<LegMv> allLegs = new ArrayList<>();
        for (int offset = -2; offset <= 2; offset++) {
            List<LegMv> dayLegs = generateLegsForDay(today.plusDays(offset));
            allLegs.addAll(dayLegs);
            log.debug("[FakeMV] Generated {} legs for {}", dayLegs.size(), today.plusDays(offset));
        }
        legMvRepository.saveAll(allLegs);

        List<LegMv> todayLegs = legMvRepository.findByOperationalDate(today);
        lastChecksum = computeChecksum(todayLegs);

        // Summary by leg type for easy verification in logs
        Map<String, Long> byType = new java.util.LinkedHashMap<>();
        allLegs.forEach(l -> byType.merge(l.getLegType(), 1L, Long::sum));
        log.info("[FakeMV] Seeded {} legs across 5 days — types: {}", allLegs.size(), byType);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Scheduled refresh — every 3 minutes
    // ═══════════════════════════════════════════════════════════════════════

    @Scheduled(cron = "${app.fake-mv.refresh-cron:0 */3 * * * *}")
    @Transactional("postgresTransactionManager")
    public void refreshData() {
        LocalDate today = LocalDate.now();
        List<LegMv> todayLegs = legMvRepository.findByOperationalDate(today);
        if (todayLegs.isEmpty()) {
            log.warn("[FakeMV] No legs found for today ({}) — re-seeding", today);
            initializeData();
            return;
        }

        int stateChanges = 0;
        int delayChanges = 0;

        // 1. Advance state machine for all today's legs
        for (LegMv leg : todayLegs) {
            if (advanceLegState(leg)) stateChanges++;
        }

        // 2. Randomly add delays to a small subset (at most 4 legs, 35% chance each)
        List<LegMv> candidates = new ArrayList<>(todayLegs);
        Collections.shuffle(candidates, random);
        int delayBudget = Math.min(4, Math.max(1, todayLegs.size() / 6));
        for (int i = 0; i < delayBudget; i++) {
            LegMv leg = candidates.get(i);
            if (leg.getDelays().isEmpty()
                    && !isTerminal(leg.getLegState())
                    && random.nextFloat() < 0.35f) {
                addRandomDelay(leg);
                delayChanges++;
            }
        }

        legMvRepository.saveAll(todayLegs);

        // 3. Publish event only when data actually changed (CRC32 guard)
        long newChecksum = computeChecksum(todayLegs);
        if (newChecksum != lastChecksum) {
            lastChecksum = newChecksum;
            int total = stateChanges + delayChanges;
            log.info("[FakeMV] Refresh complete — {} state change(s), {} new delay(s), publishing MvRefreshEvent",
                    stateChanges, delayChanges);
            eventPublisher.publishEvent(new MvRefreshEvent(this, total));
        } else {
            log.debug("[FakeMV] Refresh — no changes detected (checksum unchanged)");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Data generation
    // ═══════════════════════════════════════════════════════════════════════
private List<LegMv> checkCollisionsFlightTime(List<LegMv> legs) {

    // Group legs by aircraft (REAL constraint)
    Map<String, List<LegMv>> byAircraft = legs.stream()
            .collect(Collectors.groupingBy(LegMv::getAircraftRegistration));

    for (Map.Entry<String, List<LegMv>> entry : byAircraft.entrySet()) {

        String aircraft = entry.getKey();
        List<LegMv> sameAircraftLegs = entry.getValue();

        // Sort by scheduled departure time (STD)
        sameAircraftLegs.sort(Comparator.comparing(LegMv::getStd));

        for (int i = 0; i < sameAircraftLegs.size() - 1; i++) {

            LegMv current = sameAircraftLegs.get(i);
            LegMv next = sameAircraftLegs.get(i + 1);

            //  REAL collision condition: current flight ends AFTER next starts
            if (current.getSta().isAfter(next.getStd())) {

                // Calculate exact overlap duration
                long overlapMinutes = Duration
                        .between(next.getStd(), current.getSta())
                        .toMinutes();

                // Add turnaround buffer (e.g., 30 min)
                long shiftMinutes = overlapMinutes + 30;

                log.warn("[FakeMV] Rotation conflict for aircraft {} between leg {} and {}. Shifting by {} minutes.",
                        aircraft, current.getLegNo(), next.getLegNo(), shiftMinutes);
                // Apply shift to next leg (and keep consistency)
                next.setStd(next.getStd().plusMinutes(shiftMinutes));
                next.setSta(next.getSta().plusMinutes(shiftMinutes));
                next.setEtd(next.getEtd().plusMinutes(shiftMinutes));
                next.setEta(next.getEta().plusMinutes(shiftMinutes));

            }
        }
    }

    return legs;
}
    private List<LegMv> generateLegsForDay(LocalDate date) {
        List<LegMv> legs = new ArrayList<>();
        // Epoch-day prefix guarantees unique legNo across all days with no collisions
        long dayBase = date.toEpochDay() * 100;

        for (int i = 0; i < SCHEDULE.size(); i++) {
            FlightTemplate t  = SCHEDULE.get(i);
            AirportRef     dep = AIRPORTS.get(t.depIata());
            AirportRef     arr = AIRPORTS.get(t.arrIata());
            AircraftRef    ac  = FLEET.get(t.aircraftReg());

            LocalDateTime std = date.atTime(t.std());
            LocalDateTime sta = std.plusMinutes(t.durationMin());

            // Load figures — cargo legs have no pax
            boolean isCargo = "F".equals(t.legType()) || "P".equals(t.legType());
            int paxBooked   = isCargo ? 0 : (int) (t.paxCapacity() * (0.68 + random.nextDouble() * 0.30));
            int paxBusiness = (!isCargo && t.businessCap() > 0)
                    ? (int) (t.businessCap() * (0.45 + random.nextDouble() * 0.50))
                    : 0;

            LegMv leg = LegMv.builder()
                    .legNo(dayBase + i + 1)
                    .flightNumber(t.flightNumber())
                    .carrierCode("AT")
                    .operationalDate(date)
                    .legState(computeInitialState(std, t.durationMin()))
                    .legType(t.legType())
                    .std(std).sta(sta).etd(std).eta(sta)
                    .paxBooked(paxBooked)
                    .paxBusiness(paxBusiness)
                    .paxEconomy(isCargo ? 0 : paxBooked - paxBusiness)
                    // Cargo weight: heavier on cargo/charter legs
                    .cargoWeight(round1dp(isCargo
                            ? 8000 + random.nextDouble() * 14000
                            : 500 + random.nextDouble() * 4000))
                    .baggageWeight(round1dp(isCargo ? 0.0 : paxBooked * 18.5 + random.nextDouble() * 400))
                    .depAirportCode(dep.iata()).depAirportName(dep.name())
                    .depTimezone(dep.tz()).depLatitude(dep.lat()).depLongitude(dep.lon())
                    .arrAirportCode(arr.iata()).arrAirportName(arr.name())
                    .arrTimezone(arr.tz()).arrLatitude(arr.lat()).arrLongitude(arr.lon())
                    .aircraftRegistration(ac.reg()).aircraftSubType(ac.type())
                    .aircraftMaxWeight(ac.maxWeight()).aircraftCargoCapacity(ac.cargoCapacity())
                    .lastRefreshed(LocalDateTime.now())
                    .delays(new ArrayList<>())
                    .build();

            applyActualTimes(leg, std, t.durationMin());
            legs.add(leg);
        }

        return checkCollisionsFlightTime(legs);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  State machine
    // ═══════════════════════════════════════════════════════════════════════

    /** Computes the initial leg state when the leg is first generated relative to now. */
    private String computeInitialState(LocalDateTime std, int durationMin) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sta = std.plusMinutes(durationMin);
        if (std.isAfter(now.plusMinutes(60)))   return "SCHEDULED";
        if (std.isAfter(now.minusMinutes(30)))  return "BOARDING";
        if (sta.isAfter(now.minusMinutes(20)))  return "AIRBORNE";
        if (sta.isAfter(now.minusMinutes(60)))  return "LANDED";
        return "ARRIVED";
    }

    /**
     * Advances the leg state based on the current clock.
     *
     * @return true if the state actually changed
     */
    private boolean advanceLegState(LegMv leg) {
        if (isTerminal(leg.getLegState())) return false;

        LocalDateTime now     = LocalDateTime.now();
        LocalDateTime etd     = leg.getEtd() != null ? leg.getEtd() : leg.getStd();
        int           duration = (int) Duration.between(leg.getStd(), leg.getSta()).toMinutes();

        String next;
        if      (etd.isAfter(now.plusMinutes(60)))                           next = "SCHEDULED";
        else if (etd.isAfter(now.minusMinutes(30)))                          next = "BOARDING";
        else if (etd.plusMinutes(duration).isAfter(now.minusMinutes(15)))    next = "AIRBORNE";
        else if (etd.plusMinutes(duration).isAfter(now.minusMinutes(60)))    next = "LANDED";
        else                                                                  next = "ARRIVED";

        if (next.equals(leg.getLegState())) return false;

        log.debug("[FakeMV] {} {} → {} (etd={})", leg.getFlightNumber(), leg.getLegState(), next, etd);
        leg.setLegState(next);
        applyActualTimes(leg, etd, duration);
        leg.setLastRefreshed(now);
        return true;
    }

    /** Fills in actual OOOI times once the leg moves past BOARDING. */
    private void applyActualTimes(LegMv leg, LocalDateTime etd, int durationMin) {
        String state = leg.getLegState();
        // Small variance: ±2 min around the ETD for realism
        LocalDateTime realDep = etd.plusMinutes(random.nextInt(5) - 2);

        if ("AIRBORNE".equals(state) || "LANDED".equals(state) || "ARRIVED".equals(state)) {
            if (leg.getOffBlock()  == null) leg.setOffBlock(realDep.minusMinutes(5));
            if (leg.getAirborne()  == null) leg.setAirborne(realDep);
        }
        if ("LANDED".equals(state) || "ARRIVED".equals(state)) {
            LocalDateTime realArr = realDep.plusMinutes(durationMin);
            if (leg.getLanding()   == null) leg.setLanding(realArr);
            if (leg.getOnBlock()   == null) leg.setOnBlock(realArr.plusMinutes(8));
            leg.setEta(realArr);
        }
        if ("ARRIVED".equals(state) && leg.getPaxFlown() == null && leg.getPaxBooked() != null) {
            // Normal no-show rate: 96–100 % of booked passengers actually board
            leg.setPaxFlown((int) (leg.getPaxBooked() * (0.96 + random.nextDouble() * 0.04)));
        }
    }

    private void addRandomDelay(LegMv leg) {
        String[] entry   = DELAY_CODES.get(random.nextInt(DELAY_CODES.size()));
        int      minutes = 10 + random.nextInt(91); // 10–100 min

        leg.getDelays().add(LegMvDelay.builder()
                .legMv(leg)
                .code(entry[0])
                .duration(minutes)
                .description(entry[1])
                .build());

        if (leg.getEtd() != null) leg.setEtd(leg.getEtd().plusMinutes(minutes));
        if (leg.getEta() != null) leg.setEta(leg.getEta().plusMinutes(minutes));
        leg.setLastRefreshed(LocalDateTime.now());

        log.debug("[FakeMV] Delay added — flight={} code={} duration={}min", leg.getFlightNumber(), entry[0], minutes);
    }

    private static boolean isTerminal(String state) {
        return "ARRIVED".equals(state) || "CANCELLED".equals(state);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Change detection — CRC32 over operational fields
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Computes a CRC32 over each leg's key operational fields (sorted by legNo).
     * A change in any state, delay count, ETD, or ETA produces a different value,
     * preventing unnecessary cache eviction and SSE broadcasts.
     *
     * CRC32 is used (not {@code String.hashCode()}) to avoid 32-bit collisions
     * on long concatenated strings.
     */
    private long computeChecksum(List<LegMv> legs) {
        CRC32 crc = new CRC32();
        legs.stream()
                .sorted(Comparator.comparingLong(LegMv::getLegNo))
                .forEach(l -> {
                    String entry = l.getLegNo()        + "|"
                            + l.getLegState()           + "|"
                            + l.getDelays().size()       + "|"
                            + l.getEtd()                + "|"
                            + l.getEta();
                    crc.update(entry.getBytes());
                });
        return crc.getValue();
    }

    private static double round1dp(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
