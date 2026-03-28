package com.ram.netline_reader_backend.provider.fake;

import com.ram.netline_reader_backend.entity.fake.LegMv;
import com.ram.netline_reader_backend.entity.fake.LegMvDelay;
import com.ram.netline_reader_backend.event.MvRefreshEvent;
import com.ram.netline_reader_backend.repository.fake.LegMvRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.zip.CRC32;

/**
 * Simulates an Oracle Materialized View refresh for the dev environment.
 *
 * Startup  — seeds {@code leg_mv} with a realistic Royal Air Maroc schedule for ±2 days.
 * Every 3 min — advances leg states based on the current clock, randomly adds delays
 *               to a subset of legs, then publishes {@link MvRefreshEvent} if data changed.
 *
 * Active only on the {@code dev} profile.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class FakeMvRefreshJob {

    private final LegMvRepository legMvRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final Random random = new Random();

    /** CRC32 of the last persisted state — used to detect actual changes. */
    private long lastChecksum = -1L;

    // ═══════════════════════════════════════════════════════════════════════
    //  Static reference data
    // ═══════════════════════════════════════════════════════════════════════

    record AirportRef(String iata, String name, String tz, double lat, double lon) {}
    record AircraftRef(String reg, String type, double maxWeight, double cargoCapacity) {}

    /**
     * A scheduled flight template — one row in the daily timetable.
     *
     * @param flightNumber  AT-prefixed flight number
     * @param depIata       departure IATA code
     * @param arrIata       arrival IATA code
     * @param std           scheduled departure time (local clock, no timezone)
     * @param durationMin   block time in minutes
     * @param aircraftReg   tail number — must exist in {@link #FLEET}
     * @param paxCapacity   total seat count
     * @param businessCap   business class seats (0 for mono-class ATR)
     */
    record FlightTemplate(
            String flightNumber, String depIata, String arrIata,
            LocalTime std, int durationMin,
            String aircraftReg, int paxCapacity, int businessCap) {}

    private static final Map<String, AirportRef> AIRPORTS = Map.ofEntries(
            Map.entry("CMN", new AirportRef("CMN", "Casablanca Mohammed V",     "Africa/Casablanca",  33.3675,  -7.5898)),
            Map.entry("CDG", new AirportRef("CDG", "Paris Charles de Gaulle",   "Europe/Paris",       49.0097,   2.5479)),
            Map.entry("MAD", new AirportRef("MAD", "Madrid Barajas",            "Europe/Madrid",      40.4983,  -3.5676)),
            Map.entry("LHR", new AirportRef("LHR", "London Heathrow",           "Europe/London",      51.4775,  -0.4614)),
            Map.entry("FRA", new AirportRef("FRA", "Frankfurt International",   "Europe/Berlin",      50.0379,   8.5622)),
            Map.entry("BCN", new AirportRef("BCN", "Barcelona El Prat",         "Europe/Madrid",      41.2971,   2.0785)),
            Map.entry("BRU", new AirportRef("BRU", "Brussels Airport",          "Europe/Brussels",    50.9014,   4.4844)),
            Map.entry("RAK", new AirportRef("RAK", "Marrakech Menara",          "Africa/Casablanca",  31.6069,  -8.0363)),
            Map.entry("AGA", new AirportRef("AGA", "Agadir Al Massira",         "Africa/Casablanca",  30.3250,  -9.4130)),
            Map.entry("FEZ", new AirportRef("FEZ", "Fez-Saiss",                 "Africa/Casablanca",  33.9273,  -4.9779)),
            Map.entry("TUN", new AirportRef("TUN", "Tunis Carthage",            "Africa/Tunis",       36.8510,  10.2271)),
            Map.entry("ALG", new AirportRef("ALG", "Algiers Houari Boumediene", "Africa/Algiers",     36.6910,   3.2154)),
            Map.entry("ORN", new AirportRef("ORN", "Oran Ahmed Ben Bella",      "Africa/Algiers",     35.6239,  -0.6212)),
            Map.entry("DXB", new AirportRef("DXB", "Dubai International",       "Asia/Dubai",         25.2528,  55.3644))
    );

    private static final Map<String, AircraftRef> FLEET = Map.of(
            "CN-RGT", new AircraftRef("CN-RGT", "B787-9",    242000.0, 22000.0),
            "CN-RBN", new AircraftRef("CN-RBN", "B787-9",    242000.0, 22000.0),
            "CN-RGS", new AircraftRef("CN-RGS", "B737 MAX 8", 79016.0, 15000.0),
            "CN-ROC", new AircraftRef("CN-ROC", "B737 MAX 8", 79016.0, 15000.0),
            "CN-ATU", new AircraftRef("CN-ATU", "ATR72-600",  23000.0,  7500.0),
            "CN-ATV", new AircraftRef("CN-ATV", "ATR72-600",  23000.0,  7500.0)
    );

    /** IATA AHM delay codes — code + description pairs. */
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

    /** Daily timetable: 22 legs covering long-, medium-, and short-haul routes. */
    private static final List<FlightTemplate> SCHEDULE = List.of(
            // ── Long haul (B787-9) ────────────────────────────────────────
            new FlightTemplate("AT201", "CMN", "CDG", LocalTime.of( 8, 30), 210, "CN-RGT", 280, 20),
            new FlightTemplate("AT202", "CDG", "CMN", LocalTime.of(14, 30), 215, "CN-RGT", 280, 20),
            new FlightTemplate("AT203", "CMN", "CDG", LocalTime.of(17, 15), 210, "CN-RBN", 280, 20),
            new FlightTemplate("AT204", "CDG", "CMN", LocalTime.of( 7,  0), 220, "CN-RBN", 280, 20),
            new FlightTemplate("AT221", "CMN", "LHR", LocalTime.of(10,  0), 240, "CN-RGT", 280, 20),
            new FlightTemplate("AT222", "LHR", "CMN", LocalTime.of(15,  0), 235, "CN-RGT", 280, 20),
            new FlightTemplate("AT701", "CMN", "DXB", LocalTime.of(23, 30), 420, "CN-RBN", 280, 28),
            new FlightTemplate("AT702", "DXB", "CMN", LocalTime.of(10,  0), 430, "CN-RBN", 280, 28),
            // ── Medium haul (B737 MAX 8) ──────────────────────────────────
            new FlightTemplate("AT231", "CMN", "FRA", LocalTime.of( 9,  0), 270, "CN-RGS", 162, 12),
            new FlightTemplate("AT232", "FRA", "CMN", LocalTime.of(15, 30), 260, "CN-RGS", 162, 12),
            new FlightTemplate("AT211", "CMN", "MAD", LocalTime.of( 7,  0), 110, "CN-ROC", 162, 12),
            new FlightTemplate("AT212", "MAD", "CMN", LocalTime.of(10, 15), 115, "CN-ROC", 162, 12),
            new FlightTemplate("AT500", "CMN", "ALG", LocalTime.of(11,  0), 115, "CN-RGS", 162, 12),
            new FlightTemplate("AT501", "ALG", "CMN", LocalTime.of(14, 30), 115, "CN-RGS", 162, 12),
            new FlightTemplate("AT502", "CMN", "TUN", LocalTime.of(12, 30), 145, "CN-ROC", 162, 12),
            new FlightTemplate("AT503", "TUN", "CMN", LocalTime.of(16,  0), 150, "CN-ROC", 162, 12),
            // ── Domestic short haul (ATR72-600) ──────────────────────────
            new FlightTemplate("AT401", "CMN", "RAK", LocalTime.of( 6, 30),  60, "CN-ATU",  72,  0),
            new FlightTemplate("AT402", "RAK", "CMN", LocalTime.of( 8,  0),  60, "CN-ATU",  72,  0),
            new FlightTemplate("AT403", "CMN", "AGA", LocalTime.of( 7,  0),  80, "CN-ATV",  72,  0),
            new FlightTemplate("AT404", "AGA", "CMN", LocalTime.of( 9,  0),  80, "CN-ATV",  72,  0),
            new FlightTemplate("AT405", "CMN", "FEZ", LocalTime.of( 7, 30),  55, "CN-ATU",  72,  0),
            new FlightTemplate("AT406", "FEZ", "CMN", LocalTime.of( 9,  0),  55, "CN-ATU",  72,  0)
    );

    // ═══════════════════════════════════════════════════════════════════════
    //  Startup seed
    // ═══════════════════════════════════════════════════════════════════════

    /** Seeds the table on every application start (fresh state). */
    @PostConstruct
    @Transactional("postgresTransactionManager")
    public void initializeData() {
        log.info("[FakeMV] Seeding leg_mv table (rolling ±2 day window)...");
        legMvRepository.deleteAll();

        LocalDate today = LocalDate.now();
        List<LegMv> allLegs = new ArrayList<>();
        for (int offset = -1; offset <= 3; offset++) {
            allLegs.addAll(generateLegsForDay(today.plusDays(offset)));
        }
        legMvRepository.saveAll(allLegs);

        List<LegMv> todayLegs = legMvRepository.findByOperationalDate(today);
        lastChecksum = computeChecksum(todayLegs);
        log.info("[FakeMV] Seeded {} legs across 5 days", allLegs.size());
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
            log.warn("[FakeMV] No legs found for today — re-seeding");
            initializeData();
            return;
        }

        int changed = 0;

        // 1. Advance leg states for all today's legs
        for (LegMv leg : todayLegs) {
            if (advanceLegState(leg)) changed++;
        }

        // 2. Randomly add delays to a small subset (at most 4 legs, 35% chance each)
        List<LegMv> candidates = new ArrayList<>(todayLegs);
        Collections.shuffle(candidates, random);
        int delayBudget = Math.min(4, Math.max(1, todayLegs.size() / 5));
        for (int i = 0; i < delayBudget; i++) {
            LegMv leg = candidates.get(i);
            if (leg.getDelays().isEmpty()
                    && !isTerminal(leg.getLegState())
                    && random.nextFloat() < 0.35f) {
                addRandomDelay(leg);
                changed++;
            }
        }

        legMvRepository.saveAll(todayLegs);

        // 3. Detect real changes via checksum and publish event only if data changed
        long newChecksum = computeChecksum(todayLegs);
        if (newChecksum != lastChecksum) {
            lastChecksum = newChecksum;
            log.info("[FakeMV] Refresh — {} records changed, publishing MvRefreshEvent", changed);
            eventPublisher.publishEvent(new MvRefreshEvent(this, changed));
        } else {
            log.debug("[FakeMV] Refresh — no changes detected");
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Data generation
    // ═══════════════════════════════════════════════════════════════════════

    private List<LegMv> generateLegsForDay(LocalDate date) {
        List<LegMv> legs = new ArrayList<>();
        // Use epoch day as a stable, date-unique prefix for legNo (no collisions across days)
        long dayBase = date.toEpochDay() * 100;

        for (int i = 0; i < SCHEDULE.size(); i++) {
            FlightTemplate t = SCHEDULE.get(i);
            AirportRef dep  = AIRPORTS.get(t.depIata());
            AirportRef arr  = AIRPORTS.get(t.arrIata());
            AircraftRef ac  = FLEET.get(t.aircraftReg());

            LocalDateTime std = date.atTime(t.std());
            LocalDateTime sta = std.plusMinutes(t.durationMin());

            int paxBooked   = (int) (t.paxCapacity() * (0.70 + random.nextDouble() * 0.28));
            int paxBusiness = t.businessCap() > 0
                    ? (int) (t.businessCap() * (0.50 + random.nextDouble() * 0.45))
                    : 0;

            LegMv leg = LegMv.builder()
                    .legNo(dayBase + i + 1)
                    .flightNumber(t.flightNumber())
                    .carrierCode("AT")
                    .operationalDate(date)
                    .legState(computeInitialState(std, t.durationMin()))
                    .legType("J")
                    .std(std).sta(sta).etd(std).eta(sta)
                    .paxBooked(paxBooked)
                    .paxBusiness(paxBusiness)
                    .paxEconomy(paxBooked - paxBusiness)
                    .cargoWeight(round1dp(800 + random.nextDouble() * 4200))
                    .baggageWeight(round1dp(paxBooked * 18.0 + random.nextDouble() * 500))
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
        return legs;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  State machine
    // ═══════════════════════════════════════════════════════════════════════

    /** Determines the initial leg state for a newly generated leg relative to now. */
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
     * Advances the leg's state based on the current clock.
     *
     * @return true if the state actually changed
     */
    private boolean advanceLegState(LegMv leg) {
        if (isTerminal(leg.getLegState())) return false;

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime etd = leg.getEtd() != null ? leg.getEtd() : leg.getStd();
        int duration = (int) Duration.between(leg.getStd(), leg.getSta()).toMinutes();

        String next;
        if (etd.isAfter(now.plusMinutes(60)))                         next = "SCHEDULED";
        else if (etd.isAfter(now.minusMinutes(30)))                   next = "BOARDING";
        else if (etd.plusMinutes(duration).isAfter(now.minusMinutes(15))) next = "AIRBORNE";
        else if (etd.plusMinutes(duration).isAfter(now.minusMinutes(60))) next = "LANDED";
        else                                                           next = "ARRIVED";

        if (next.equals(leg.getLegState())) return false;

        leg.setLegState(next);
        applyActualTimes(leg, etd, duration);
        leg.setLastRefreshed(now);
        return true;
    }

    /** Sets block/airborne/landing times when the leg moves past BOARDING. */
    private void applyActualTimes(LegMv leg, LocalDateTime etd, int durationMin) {
        String state = leg.getLegState();
        // Small variance: ± 2 minutes around the ETD for realism
        LocalDateTime realDep = etd.plusMinutes(random.nextInt(5) - 2);

        if ("AIRBORNE".equals(state) || "LANDED".equals(state) || "ARRIVED".equals(state)) {
            if (leg.getOffBlock() == null) leg.setOffBlock(realDep.minusMinutes(5));
            if (leg.getAirborne() == null) leg.setAirborne(realDep);
        }
        if ("LANDED".equals(state) || "ARRIVED".equals(state)) {
            LocalDateTime realArr = realDep.plusMinutes(durationMin);
            if (leg.getLanding() == null) leg.setLanding(realArr);
            if (leg.getOnBlock() == null) leg.setOnBlock(realArr.plusMinutes(8));
            leg.setEta(realArr);
        }
        if ("ARRIVED".equals(state) && leg.getPaxFlown() == null) {
            // Slightly fewer than booked — normal no-show rate
            leg.setPaxFlown((int) (leg.getPaxBooked() * (0.96 + random.nextDouble() * 0.04)));
        }
    }

    private void addRandomDelay(LegMv leg) {
        String[] entry   = DELAY_CODES.get(random.nextInt(DELAY_CODES.size()));
        int      minutes = 10 + random.nextInt(91); // 10 – 100 min

        leg.getDelays().add(LegMvDelay.builder()
                .legMv(leg)
                .code(entry[0])
                .duration(minutes)
                .description(entry[1])
                .build());

        // Push estimates forward by the delay duration
        if (leg.getEtd() != null) leg.setEtd(leg.getEtd().plusMinutes(minutes));
        if (leg.getEta() != null) leg.setEta(leg.getEta().plusMinutes(minutes));
        leg.setLastRefreshed(LocalDateTime.now());

        log.debug("[FakeMV] Delay {}/{}min added to {}", entry[0], minutes, leg.getFlightNumber());
    }

    private static boolean isTerminal(String state) {
        return "ARRIVED".equals(state) || "CANCELLED".equals(state);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Change detection — CRC32 over operational fields
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Computes a CRC32 checksum over each leg's key operational fields.
     * A change in any leg's state, delay count, or estimated times
     * produces a different checksum and triggers cache/SSE notification.
     *
     * CRC32 is used instead of {@code String.hashCode()} to avoid collisions
     * on long concatenated strings.
     */
    private long computeChecksum(List<LegMv> legs) {
        CRC32 crc = new CRC32();
        legs.stream()
                .sorted(Comparator.comparingLong(LegMv::getLegNo))
                .forEach(l -> {
                    String entry = l.getLegNo() + "|"
                            + l.getLegState() + "|"
                            + l.getDelays().size() + "|"
                            + l.getEtd() + "|"
                            + l.getEta();
                    crc.update(entry.getBytes());
                });
        return crc.getValue();
    }

    private static double round1dp(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
