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
 * Fleet — 30 aircraft across 4 types:
 *   B787-9    (CN-RGT, CN-RBN, CN-RGA, CN-RGB)          — long-haul PAX + cargo
 *   A321neo   (CN-NMA … CN-NMG)                           — medium-haul Europe
 *   B737 MAX 8 (CN-RGS, CN-ROC, CN-ROD … CN-ROK)         — medium-haul Africa/ME/Europe
 *   ATR72-600  (CN-ATU, CN-ATV, CN-ATW … CN-ATC)         — domestic Morocco
 *
 * All aircraft legs are non-overlapping with realistic turnaround times:
 *   ≥ 45 min ATR72 domestic · ≥ 60 min B737/A321 medium · ≥ 90 min B787 long-haul.
 *
 * Leg types: J (PAX), F (Cargo), P (Positioning/Ferry).
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
     * @param legType       IATA leg type code: J=PAX, F=Cargo, P=Positioning
     * @param paxCapacity   total seat count (0 for pure cargo/positioning)
     * @param businessCap   business class seats (0 = mono-class or cargo)
     */
    record FlightTemplate(
            String flightNumber, String depIata, String arrIata,
            LocalTime std, int durationMin,
            String aircraftReg, String legType,
            int paxCapacity, int businessCap) {}

    private static final Map<String, AirportRef> AIRPORTS = Map.ofEntries(
            // ── Morocco ──────────────────────────────────────────────────────
            Map.entry("CMN", new AirportRef("CMN", "Casablanca Mohammed V",        "Africa/Casablanca",  33.3675,  -7.5898)),
            Map.entry("RAK", new AirportRef("RAK", "Marrakech Menara",             "Africa/Casablanca",  31.6069,  -8.0363)),
            Map.entry("AGA", new AirportRef("AGA", "Agadir Al Massira",            "Africa/Casablanca",  30.3250,  -9.4130)),
            Map.entry("FEZ", new AirportRef("FEZ", "Fez-Saiss",                    "Africa/Casablanca",  33.9273,  -4.9779)),
            Map.entry("OZZ", new AirportRef("OZZ", "Ouarzazate",                   "Africa/Casablanca",  30.9391,  -6.9094)),
            Map.entry("NDR", new AirportRef("NDR", "Nador Al Aroui",               "Africa/Casablanca",  34.9888,  -3.0282)),
            Map.entry("TTA", new AirportRef("TTA", "Tan Tan",                      "Africa/Casablanca",  28.4482, -11.1613)),
            Map.entry("ERH", new AirportRef("ERH", "Errachidia",                   "Africa/Casablanca",  31.9475,  -4.3983)),
            Map.entry("SMW", new AirportRef("SMW", "Smara",                        "Africa/Casablanca",  26.7318, -11.6838)),
            // ── North Africa ─────────────────────────────────────────────────
            Map.entry("ALG", new AirportRef("ALG", "Algiers Houari Boumediene",    "Africa/Algiers",     36.6910,   3.2154)),
            Map.entry("ORN", new AirportRef("ORN", "Oran Ahmed Ben Bella",         "Africa/Algiers",     35.6239,  -0.6212)),
            Map.entry("TUN", new AirportRef("TUN", "Tunis Carthage",               "Africa/Tunis",       36.8510,  10.2271)),
            Map.entry("CAI", new AirportRef("CAI", "Cairo International",          "Africa/Cairo",       30.1219,  31.4056)),
            // ── Sub-Saharan Africa ────────────────────────────────────────────
            Map.entry("DAK", new AirportRef("DAK", "Dakar Blaise Diagne",          "Africa/Dakar",       14.6702, -17.0722)),
            Map.entry("ABJ", new AirportRef("ABJ", "Abidjan Felix Houphouet",      "Africa/Abidjan",      5.2613,  -3.9264)),
            Map.entry("NBO", new AirportRef("NBO", "Nairobi Jomo Kenyatta",        "Africa/Nairobi",     -1.3192,  36.9275)),
            // ── Middle East ───────────────────────────────────────────────────
            Map.entry("DXB", new AirportRef("DXB", "Dubai International",          "Asia/Dubai",         25.2528,  55.3644)),
            Map.entry("JED", new AirportRef("JED", "Jeddah King Abdulaziz",        "Asia/Riyadh",        21.6796,  39.1565)),
            Map.entry("BEY", new AirportRef("BEY", "Beirut Rafic Hariri",          "Asia/Beirut",        33.8208,  35.4884)),
            // ── Europe ───────────────────────────────────────────────────────
            Map.entry("CDG", new AirportRef("CDG", "Paris Charles de Gaulle",      "Europe/Paris",       49.0097,   2.5479)),
            Map.entry("MAD", new AirportRef("MAD", "Madrid Barajas",               "Europe/Madrid",      40.4983,  -3.5676)),
            Map.entry("LHR", new AirportRef("LHR", "London Heathrow",              "Europe/London",      51.4775,  -0.4614)),
            Map.entry("FRA", new AirportRef("FRA", "Frankfurt International",      "Europe/Berlin",      50.0379,   8.5622)),
            Map.entry("BCN", new AirportRef("BCN", "Barcelona El Prat",            "Europe/Madrid",      41.2971,   2.0785)),
            Map.entry("BRU", new AirportRef("BRU", "Brussels Airport",             "Europe/Brussels",    50.9014,   4.4844)),
            Map.entry("MRS", new AirportRef("MRS", "Marseille Provence",           "Europe/Paris",       43.4393,   5.2214)),
            Map.entry("LIS", new AirportRef("LIS", "Lisbon Humberto Delgado",      "Europe/Lisbon",      38.7742,  -9.1342)),
            Map.entry("GVA", new AirportRef("GVA", "Geneva Airport",               "Europe/Zurich",      46.2381,   6.1089)),
            Map.entry("AMS", new AirportRef("AMS", "Amsterdam Schiphol",           "Europe/Amsterdam",   52.3086,   4.7639)),
            Map.entry("NCE", new AirportRef("NCE", "Nice Côte d'Azur",             "Europe/Paris",       43.6584,   7.2158)),
            Map.entry("MXP", new AirportRef("MXP", "Milan Malpensa",               "Europe/Rome",        45.6306,   8.7281)),
            Map.entry("FCO", new AirportRef("FCO", "Rome Fiumicino",               "Europe/Rome",        41.7999,  12.2462)),
            Map.entry("ATH", new AirportRef("ATH", "Athens International",         "Europe/Athens",      37.9364,  23.9445)),
            // ── Transatlantic ─────────────────────────────────────────────────
            Map.entry("JFK", new AirportRef("JFK", "New York John F. Kennedy",     "America/New_York",   40.6413, -73.7781))
    );

    // ── Aircraft registration constants — single source of truth ────────────
    // B787-9 long-haul fleet
    private static final String REG_RGT = "CN-RGT";
    private static final String REG_RBN = "CN-RBN";
    private static final String REG_RGA = "CN-RGA";
    private static final String REG_RGB = "CN-RGB";
    // A321neo medium-haul Europe fleet
    private static final String REG_NMA = "CN-NMA";
    private static final String REG_NMB = "CN-NMB";
    private static final String REG_NMC = "CN-NMC";
    private static final String REG_NMD = "CN-NMD";
    private static final String REG_NME = "CN-NME";
    private static final String REG_NMF = "CN-NMF";
    private static final String REG_NMG = "CN-NMG";
    // B737 MAX 8 medium-haul fleet
    private static final String REG_RGS = "CN-RGS";
    private static final String REG_ROC = "CN-ROC";
    private static final String REG_ROD = "CN-ROD";
    private static final String REG_ROE = "CN-ROE";
    private static final String REG_ROF = "CN-ROF";
    private static final String REG_ROG = "CN-ROG";
    private static final String REG_ROH = "CN-ROH";
    private static final String REG_ROI = "CN-ROI";
    private static final String REG_ROJ = "CN-ROJ";
    private static final String REG_ROK = "CN-ROK";
    // ATR72-600 domestic fleet
    private static final String REG_ATU = "CN-ATU";
    private static final String REG_ATV = "CN-ATV";
    private static final String REG_ATW = "CN-ATW";
    private static final String REG_ATX = "CN-ATX";
    private static final String REG_ATY = "CN-ATY";
    private static final String REG_ATZ = "CN-ATZ";
    private static final String REG_ATA = "CN-ATA";
    private static final String REG_ATB = "CN-ATB";
    private static final String REG_ATC = "CN-ATC";

    private static final Map<String, AircraftRef> FLEET = Map.ofEntries(
            // B787-9  — MTOW 242,000 kg · cargo belly 22,000 kg
            Map.entry(REG_RGT, new AircraftRef(REG_RGT, "B787-9",     242000.0, 22000.0)),
            Map.entry(REG_RBN, new AircraftRef(REG_RBN, "B787-9",     242000.0, 22000.0)),
            Map.entry(REG_RGA, new AircraftRef(REG_RGA, "B787-9",     242000.0, 22000.0)),
            Map.entry(REG_RGB, new AircraftRef(REG_RGB, "B787-9",     242000.0, 22000.0)),
            // A321neo — MTOW 97,000 kg · cargo belly 22,000 kg
            Map.entry(REG_NMA, new AircraftRef(REG_NMA, "A321neo",     97000.0, 22000.0)),
            Map.entry(REG_NMB, new AircraftRef(REG_NMB, "A321neo",     97000.0, 22000.0)),
            Map.entry(REG_NMC, new AircraftRef(REG_NMC, "A321neo",     97000.0, 22000.0)),
            Map.entry(REG_NMD, new AircraftRef(REG_NMD, "A321neo",     97000.0, 22000.0)),
            Map.entry(REG_NME, new AircraftRef(REG_NME, "A321neo",     97000.0, 22000.0)),
            Map.entry(REG_NMF, new AircraftRef(REG_NMF, "A321neo",     97000.0, 22000.0)),
            Map.entry(REG_NMG, new AircraftRef(REG_NMG, "A321neo",     97000.0, 22000.0)),
            // B737 MAX 8 — MTOW 79,016 kg · cargo belly 15,000 kg
            Map.entry(REG_RGS, new AircraftRef(REG_RGS, "B737 MAX 8",  79016.0, 15000.0)),
            Map.entry(REG_ROC, new AircraftRef(REG_ROC, "B737 MAX 8",  79016.0, 15000.0)),
            Map.entry(REG_ROD, new AircraftRef(REG_ROD, "B737 MAX 8",  79016.0, 15000.0)),
            Map.entry(REG_ROE, new AircraftRef(REG_ROE, "B737 MAX 8",  79016.0, 15000.0)),
            Map.entry(REG_ROF, new AircraftRef(REG_ROF, "B737 MAX 8",  79016.0, 15000.0)),
            Map.entry(REG_ROG, new AircraftRef(REG_ROG, "B737 MAX 8",  79016.0, 15000.0)),
            Map.entry(REG_ROH, new AircraftRef(REG_ROH, "B737 MAX 8",  79016.0, 15000.0)),
            Map.entry(REG_ROI, new AircraftRef(REG_ROI, "B737 MAX 8",  79016.0, 15000.0)),
            Map.entry(REG_ROJ, new AircraftRef(REG_ROJ, "B737 MAX 8",  79016.0, 15000.0)),
            Map.entry(REG_ROK, new AircraftRef(REG_ROK, "B737 MAX 8",  79016.0, 15000.0)),
            // ATR72-600 — MTOW 23,000 kg · cargo 7,500 kg
            Map.entry(REG_ATU, new AircraftRef(REG_ATU, "ATR72-600",   23000.0,  7500.0)),
            Map.entry(REG_ATV, new AircraftRef(REG_ATV, "ATR72-600",   23000.0,  7500.0)),
            Map.entry(REG_ATW, new AircraftRef(REG_ATW, "ATR72-600",   23000.0,  7500.0)),
            Map.entry(REG_ATX, new AircraftRef(REG_ATX, "ATR72-600",   23000.0,  7500.0)),
            Map.entry(REG_ATY, new AircraftRef(REG_ATY, "ATR72-600",   23000.0,  7500.0)),
            Map.entry(REG_ATZ, new AircraftRef(REG_ATZ, "ATR72-600",   23000.0,  7500.0)),
            Map.entry(REG_ATA, new AircraftRef(REG_ATA, "ATR72-600",   23000.0,  7500.0)),
            Map.entry(REG_ATB, new AircraftRef(REG_ATB, "ATR72-600",   23000.0,  7500.0)),
            Map.entry(REG_ATC, new AircraftRef(REG_ATC, "ATR72-600",   23000.0,  7500.0))
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
     * Daily timetable — 91 legs across 30 aircraft, all conflict-free per registration.
     *
     * Turnaround floors: ATR72 domestic ≥ 45 min · B737/A321 medium ≥ 60 min · B787 long ≥ 90 min.
     * Legs arriving past midnight are listed as same-day departures; their STA falls into
     * the next calendar day but the operational date stays the STD date.
     *
     * Rotation summary per aircraft:
     *
     *  B787-9 ─────────────────────────────────────────────────────────────────────
     *  CN-RGT  CMN 08:30→CDG 12:00 · CDG 14:00→CMN 17:35 · CMN 20:00→DXB 03:20+1
     *  CN-RBN  CMN 02:00→CDG[F]05:30 · CDG 08:00→CMN[F]11:35 · CMN 13:30→LHR 17:30 · LHR 19:30→CMN 23:25
     *  CN-RGA  CMN 10:00→CDG 13:30 · CDG 15:30→CMN 19:05
     *  CN-RGB  CMN 08:00→LHR 12:00 · LHR 14:00→CMN 17:55 · CMN 20:00→JFK 04:30+1
     *
     *  A321neo ─────────────────────────────────────────────────────────────────────
     *  CN-NMA  CMN 07:00→CDG 10:20 · CDG 12:30→CMN 15:50 · CMN 17:30→BCN 19:45
     *  CN-NMB  CMN 06:00→MAD 07:50 · MAD 09:00→CMN 10:55 · CMN 13:00→BRU 16:10 · BRU 18:00→CMN 21:10
     *  CN-NMC  CMN 08:00→FRA 12:20 · FRA 14:30→CMN 18:50
     *  CN-NMD  CMN 07:00→LIS 08:40 · LIS 10:00→CMN 11:40 · CMN 13:00→GVA 16:05 · GVA 18:00→CMN 21:05
     *  CN-NME  CMN 09:00→AMS 12:35 · AMS 14:30→CMN 18:05
     *  CN-NMF  CMN 07:30→NCE 10:20 · NCE 12:30→CMN 15:20 · CMN 17:00→MXP 19:55 · MXP 22:00→CMN 00:55+1
     *  CN-NMG  CMN 08:00→FCO 11:10 · FCO 13:00→CMN 16:10 · CMN 18:00→ATH 22:15
     *
     *  B737 MAX 8 ──────────────────────────────────────────────────────────────────
     *  CN-RGS  CMN 07:00→ORN 09:00 · ORN 10:00→CMN 12:05 · CMN 13:30→ALG 15:25 · ALG 16:45→CMN 18:40 · CMN 20:30→FRA 01:00+1
     *  CN-ROC  CMN 07:00→MAD 08:50 · MAD 10:00→CMN 11:55 · CMN 13:00→MRS 15:35 · MRS 17:00→CMN 19:35 · CMN 21:00→BCN 23:20
     *  CN-ROD  CMN 07:00→TUN 09:25 · TUN 11:00→CMN 13:30 · CMN 15:00→CAI 19:35 · CAI 21:30→CMN 02:05+1
     *  CN-ROE  CMN 08:00→JED 12:45 · JED 14:30→CMN 19:15
     *  CN-ROF  CMN 09:00→BEY 13:15 · BEY 15:00→CMN 19:15
     *  CN-ROG  CMN 08:00→DAK 11:30 · DAK 13:00→CMN 16:30 · CMN 18:00→ABJ 23:05
     *  CN-ROH  CMN 07:00→NBO 13:00 · NBO 15:00→CMN 21:00
     *  CN-ROI  CMN 07:00→ALG 08:55 · ALG 10:00→CMN 11:55 · CMN 13:00→TUN 15:25 · TUN 17:00→CMN 19:30
     *  CN-ROJ  CMN 07:30→ORN 09:30 · ORN 10:30→CMN 12:35 · CMN 14:00→FRA 18:30 · FRA 20:30→CMN 01:00+1
     *  CN-ROK  CMN 08:00→MAD 09:50 · MAD 11:00→CMN 12:55 · CMN 14:30→BCN 16:50 · BCN 18:00→CMN 20:20
     *
     *  ATR72-600 ───────────────────────────────────────────────────────────────────
     *  CN-ATU  CMN 06:30→RAK 07:30 · RAK 08:30→CMN 09:30 · CMN 10:30→FEZ 11:25 · FEZ 12:30→CMN 13:25 · CMN 15:00→AGA 16:20 · AGA 17:30→CMN 18:50
     *  CN-ATV  CMN 07:00→AGA 08:20 · AGA 09:30→CMN 10:50 · CMN 12:00→RAK 13:00 · RAK 14:00→CMN 15:00 · CMN 22:00→RAK[P]23:00
     *  CN-ATW  CMN 07:00→OZZ 08:15 · OZZ 09:15→CMN 10:30 · CMN 12:00→NDR 13:10 · NDR 14:10→CMN 15:20
     *  CN-ATX  CMN 08:00→TTA 09:30 · TTA 10:30→CMN 12:00 · CMN 13:00→ERH 14:05 · ERH 15:05→CMN 16:10
     *  CN-ATY  CMN 06:30→RAK 07:30 · RAK 08:30→CMN 09:30 · CMN 11:00→AGA 12:20 · AGA 13:30→CMN 14:50 · CMN 16:00→FEZ 16:55 · FEZ 18:00→CMN 18:55
     *  CN-ATZ  CMN 09:00→AGA 10:20 · AGA 11:30→CMN 12:50 · CMN 14:00→FEZ 14:55 · FEZ 16:00→CMN 16:55
     *  CN-ATA  CMN 07:00→FEZ 07:55 · FEZ 09:00→CMN 09:55 · CMN 11:00→OZZ 12:15 · OZZ 13:15→CMN 14:30
     *  CN-ATB  CMN 07:30→NDR 08:40 · NDR 09:40→CMN 10:50 · CMN 12:00→SMW 13:40 · SMW 14:40→CMN 16:20
     *  CN-ATC  CMN 07:00→RAK 08:00 · RAK 09:00→CMN 10:00 · CMN 11:30→AGA 12:50 · AGA 14:00→CMN 15:20 · CMN 16:30→RAK 17:30 · RAK 18:30→CMN 19:30
     */
    private static final List<FlightTemplate> SCHEDULE = List.of(

            // ══ CN-RGT (B787-9): CDG daily rotation + DXB evening departure ════════
            // 08:30 CMN→CDG arr 12:00 [dep CDG 14:00 — 120 min turn]
            // 14:00 CDG→CMN arr 17:35 [dep CMN 20:00 — 145 min turn]
            // 20:00 CMN→DXB arr 03:20+1 (overnight; AT702 return generated next day)
            new FlightTemplate("AT201", "CMN", "CDG", LocalTime.of( 8, 30), 210, REG_RGT, "J", 300, 28),
            new FlightTemplate("AT202", "CDG", "CMN", LocalTime.of(14,  0), 215, REG_RGT, "J", 300, 28),
            new FlightTemplate("AT701", "CMN", "DXB", LocalTime.of(20,  0), 420, REG_RGT, "J", 300, 36),

            // ══ CN-RBN (B787-9): early cargo CDG + LHR daily PAX rotation ══════════
            // 02:00 CMN→CDG [F] arr 05:30 [dep CDG 08:00 — 150 min]
            // 08:00 CDG→CMN [F] arr 11:35 [dep CMN 13:30 — 115 min]
            // 13:30 CMN→LHR [J] arr 17:30 [dep LHR 19:30 — 120 min]
            // 19:30 LHR→CMN [J] arr 23:25
            new FlightTemplate("AT800", "CMN", "CDG", LocalTime.of( 2,  0), 210, REG_RBN, "F",   0,  0),
            new FlightTemplate("AT801", "CDG", "CMN", LocalTime.of( 8,  0), 215, REG_RBN, "F",   0,  0),
            new FlightTemplate("AT221", "CMN", "LHR", LocalTime.of(13, 30), 240, REG_RBN, "J", 300, 28),
            new FlightTemplate("AT222", "LHR", "CMN", LocalTime.of(19, 30), 235, REG_RBN, "J", 300, 28),

            // ══ CN-RGA (B787-9): second daily CDG rotation ═══════════════════════════
            // 10:00 CMN→CDG arr 13:30 [dep CDG 15:30 — 120 min]
            // 15:30 CDG→CMN arr 19:05
            new FlightTemplate("AT203", "CMN", "CDG", LocalTime.of(10,  0), 210, REG_RGA, "J", 300, 28),
            new FlightTemplate("AT204", "CDG", "CMN", LocalTime.of(15, 30), 215, REG_RGA, "J", 300, 28),

            // ══ CN-RGB (B787-9): LHR rotation + JFK evening transatlantic ═══════════
            // 08:00 CMN→LHR arr 12:00 [dep LHR 14:00 — 120 min]
            // 14:00 LHR→CMN arr 17:55 [dep CMN 20:00 — 125 min]
            // 20:00 CMN→JFK arr 04:30+1 (overnight; return generated next day)
            new FlightTemplate("AT223", "CMN", "LHR", LocalTime.of( 8,  0), 240, REG_RGB, "J", 300, 36),
            new FlightTemplate("AT224", "LHR", "CMN", LocalTime.of(14,  0), 235, REG_RGB, "J", 300, 36),
            new FlightTemplate("AT200", "CMN", "JFK", LocalTime.of(20,  0), 510, REG_RGB, "J", 300, 40),

            // ══ CN-NMA (A321neo): CDG double + evening BCN ═══════════════════════════
            // 07:00 CMN→CDG arr 10:20 [dep CDG 12:30 — 130 min]
            // 12:30 CDG→CMN arr 15:50 [dep CMN 17:30 — 100 min]
            // 17:30 CMN→BCN arr 19:45 (overnight BCN)
            new FlightTemplate("AT205", "CMN", "CDG", LocalTime.of( 7,  0), 200, REG_NMA, "J", 220, 16),
            new FlightTemplate("AT206", "CDG", "CMN", LocalTime.of(12, 30), 200, REG_NMA, "J", 220, 16),
            new FlightTemplate("AT243", "CMN", "BCN", LocalTime.of(17, 30), 135, REG_NMA, "J", 220, 16),

            // ══ CN-NMB (A321neo): MAD double + BRU rotation ══════════════════════════
            // 06:00 CMN→MAD arr 07:50 [dep MAD 09:00 — 70 min]
            // 09:00 MAD→CMN arr 10:55 [dep CMN 13:00 — 125 min]
            // 13:00 CMN→BRU arr 16:10 [dep BRU 18:00 — 110 min]
            // 18:00 BRU→CMN arr 21:10
            new FlightTemplate("AT213", "CMN", "MAD", LocalTime.of( 6,  0), 110, REG_NMB, "J", 220, 16),
            new FlightTemplate("AT214", "MAD", "CMN", LocalTime.of( 9,  0), 115, REG_NMB, "J", 220, 16),
            new FlightTemplate("AT253", "CMN", "BRU", LocalTime.of(13,  0), 190, REG_NMB, "J", 220, 16),
            new FlightTemplate("AT254", "BRU", "CMN", LocalTime.of(18,  0), 190, REG_NMB, "J", 220, 16),

            // ══ CN-NMC (A321neo): FRA double ═════════════════════════════════════════
            // 08:00 CMN→FRA arr 12:20 [dep FRA 14:30 — 130 min]
            // 14:30 FRA→CMN arr 18:50
            new FlightTemplate("AT233", "CMN", "FRA", LocalTime.of( 8,  0), 260, REG_NMC, "J", 220, 16),
            new FlightTemplate("AT234", "FRA", "CMN", LocalTime.of(14, 30), 260, REG_NMC, "J", 220, 16),

            // ══ CN-NMD (A321neo): LIS double + GVA double ════════════════════════════
            // 07:00 CMN→LIS arr 08:40 [dep LIS 10:00 — 80 min]
            // 10:00 LIS→CMN arr 11:40 [dep CMN 13:00 — 80 min]
            // 13:00 CMN→GVA arr 16:05 [dep GVA 18:00 — 115 min]
            // 18:00 GVA→CMN arr 21:05
            new FlightTemplate("AT271", "CMN", "LIS", LocalTime.of( 7,  0), 100, REG_NMD, "J", 220, 16),
            new FlightTemplate("AT272", "LIS", "CMN", LocalTime.of(10,  0), 100, REG_NMD, "J", 220, 16),
            new FlightTemplate("AT281", "CMN", "GVA", LocalTime.of(13,  0), 185, REG_NMD, "J", 220, 16),
            new FlightTemplate("AT282", "GVA", "CMN", LocalTime.of(18,  0), 185, REG_NMD, "J", 220, 16),

            // ══ CN-NME (A321neo): AMS double ═════════════════════════════════════════
            // 09:00 CMN→AMS arr 12:35 [dep AMS 14:30 — 115 min]
            // 14:30 AMS→CMN arr 18:05
            new FlightTemplate("AT291", "CMN", "AMS", LocalTime.of( 9,  0), 215, REG_NME, "J", 220, 16),
            new FlightTemplate("AT292", "AMS", "CMN", LocalTime.of(14, 30), 215, REG_NME, "J", 220, 16),

            // ══ CN-NMF (A321neo): NCE double + MXP evening double ════════════════════
            // 07:30 CMN→NCE arr 10:20 [dep NCE 12:30 — 130 min]
            // 12:30 NCE→CMN arr 15:20 [dep CMN 17:00 — 100 min]
            // 17:00 CMN→MXP arr 19:55 [dep MXP 22:00 — 125 min]
            // 22:00 MXP→CMN arr 00:55+1
            new FlightTemplate("AT301", "CMN", "NCE", LocalTime.of( 7, 30), 170, REG_NMF, "J", 220, 16),
            new FlightTemplate("AT302", "NCE", "CMN", LocalTime.of(12, 30), 170, REG_NMF, "J", 220, 16),
            new FlightTemplate("AT311", "CMN", "MXP", LocalTime.of(17,  0), 175, REG_NMF, "J", 220, 16),
            new FlightTemplate("AT312", "MXP", "CMN", LocalTime.of(22,  0), 175, REG_NMF, "J", 220, 16),

            // ══ CN-NMG (A321neo): FCO double + ATH evening departure ══════════════════
            // 08:00 CMN→FCO arr 11:10 [dep FCO 13:00 — 110 min]
            // 13:00 FCO→CMN arr 16:10 [dep CMN 18:00 — 110 min]
            // 18:00 CMN→ATH arr 22:15 (overnight ATH)
            new FlightTemplate("AT321", "CMN", "FCO", LocalTime.of( 8,  0), 190, REG_NMG, "J", 220, 16),
            new FlightTemplate("AT322", "FCO", "CMN", LocalTime.of(13,  0), 190, REG_NMG, "J", 220, 16),
            new FlightTemplate("AT331", "CMN", "ATH", LocalTime.of(18,  0), 255, REG_NMG, "J", 220, 16),

            // ══ CN-RGS (B737 MAX 8): North Africa hub + FRA evening ══════════════════
            // 07:00 CMN→ORN arr 09:00 [dep ORN 10:00 — 60 min]
            // 10:00 ORN→CMN arr 12:05 [dep CMN 13:30 — 85 min]
            // 13:30 CMN→ALG arr 15:25 [dep ALG 16:45 — 80 min]
            // 16:45 ALG→CMN arr 18:40 [dep CMN 20:30 — 110 min]
            // 20:30 CMN→FRA arr 01:00+1 (overnight FRA)
            new FlightTemplate("AT510", "CMN", "ORN", LocalTime.of( 7,  0), 120, REG_RGS, "J", 162, 12),
            new FlightTemplate("AT511", "ORN", "CMN", LocalTime.of(10,  0), 125, REG_RGS, "J", 162, 12),
            new FlightTemplate("AT500", "CMN", "ALG", LocalTime.of(13, 30), 115, REG_RGS, "J", 162, 12),
            new FlightTemplate("AT501", "ALG", "CMN", LocalTime.of(16, 45), 115, REG_RGS, "J", 162, 12),
            new FlightTemplate("AT231", "CMN", "FRA", LocalTime.of(20, 30), 270, REG_RGS, "J", 162, 12),

            // ══ CN-ROC (B737 MAX 8): MAD + MRS + BCN Europe rotations ════════════════
            // 07:00 CMN→MAD arr 08:50 [dep MAD 10:00 — 70 min]
            // 10:00 MAD→CMN arr 11:55 [dep CMN 13:00 — 65 min]
            // 13:00 CMN→MRS arr 15:35 [dep MRS 17:00 — 85 min]
            // 17:00 MRS→CMN arr 19:35 [dep CMN 21:00 — 85 min]
            // 21:00 CMN→BCN arr 23:20 (overnight BCN)
            new FlightTemplate("AT211", "CMN", "MAD", LocalTime.of( 7,  0), 110, REG_ROC, "J", 162, 12),
            new FlightTemplate("AT212", "MAD", "CMN", LocalTime.of(10,  0), 115, REG_ROC, "J", 162, 12),
            new FlightTemplate("AT261", "CMN", "MRS", LocalTime.of(13,  0), 155, REG_ROC, "J", 162, 12),
            new FlightTemplate("AT262", "MRS", "CMN", LocalTime.of(17,  0), 155, REG_ROC, "J", 162, 12),
            new FlightTemplate("AT241", "CMN", "BCN", LocalTime.of(21,  0), 140, REG_ROC, "J", 162, 12),

            // ══ CN-ROD (B737 MAX 8): TUN double + CAI evening rotation ══════════════
            // 07:00 CMN→TUN arr 09:25 [dep TUN 11:00 — 95 min]
            // 11:00 TUN→CMN arr 13:30 [dep CMN 15:00 — 90 min]
            // 15:00 CMN→CAI arr 19:35 [dep CAI 21:30 — 115 min]
            // 21:30 CAI→CMN arr 02:05+1
            new FlightTemplate("AT502", "CMN", "TUN", LocalTime.of( 7,  0), 145, REG_ROD, "J", 162, 12),
            new FlightTemplate("AT503", "TUN", "CMN", LocalTime.of(11,  0), 150, REG_ROD, "J", 162, 12),
            new FlightTemplate("AT351", "CMN", "CAI", LocalTime.of(15,  0), 275, REG_ROD, "J", 162, 12),
            new FlightTemplate("AT352", "CAI", "CMN", LocalTime.of(21, 30), 275, REG_ROD, "J", 162, 12),

            // ══ CN-ROE (B737 MAX 8): JED rotation ════════════════════════════════════
            // 08:00 CMN→JED arr 12:45 [dep JED 14:30 — 105 min]
            // 14:30 JED→CMN arr 19:15
            new FlightTemplate("AT361", "CMN", "JED", LocalTime.of( 8,  0), 285, REG_ROE, "J", 162, 12),
            new FlightTemplate("AT362", "JED", "CMN", LocalTime.of(14, 30), 285, REG_ROE, "J", 162, 12),

            // ══ CN-ROF (B737 MAX 8): BEY rotation ════════════════════════════════════
            // 09:00 CMN→BEY arr 13:15 [dep BEY 15:00 — 105 min]
            // 15:00 BEY→CMN arr 19:15
            new FlightTemplate("AT341", "CMN", "BEY", LocalTime.of( 9,  0), 255, REG_ROF, "J", 162, 12),
            new FlightTemplate("AT342", "BEY", "CMN", LocalTime.of(15,  0), 255, REG_ROF, "J", 162, 12),

            // ══ CN-ROG (B737 MAX 8): DAK double + ABJ evening ════════════════════════
            // 08:00 CMN→DAK arr 11:30 [dep DAK 13:00 — 90 min]
            // 13:00 DAK→CMN arr 16:30 [dep CMN 18:00 — 90 min]
            // 18:00 CMN→ABJ arr 23:05 (overnight ABJ)
            new FlightTemplate("AT371", "CMN", "DAK", LocalTime.of( 8,  0), 210, REG_ROG, "J", 162, 12),
            new FlightTemplate("AT372", "DAK", "CMN", LocalTime.of(13,  0), 210, REG_ROG, "J", 162, 12),
            new FlightTemplate("AT381", "CMN", "ABJ", LocalTime.of(18,  0), 305, REG_ROG, "J", 162, 12),

            // ══ CN-ROH (B737 MAX 8): NBO rotation ════════════════════════════════════
            // 07:00 CMN→NBO arr 13:00 [dep NBO 15:00 — 120 min]
            // 15:00 NBO→CMN arr 21:00
            new FlightTemplate("AT391", "CMN", "NBO", LocalTime.of( 7,  0), 360, REG_ROH, "J", 162, 12),
            new FlightTemplate("AT392", "NBO", "CMN", LocalTime.of(15,  0), 360, REG_ROH, "J", 162, 12),

            // ══ CN-ROI (B737 MAX 8): ALG + TUN double rotation ═══════════════════════
            // 07:00 CMN→ALG arr 08:55 [dep ALG 10:00 — 65 min]
            // 10:00 ALG→CMN arr 11:55 [dep CMN 13:00 — 65 min]
            // 13:00 CMN→TUN arr 15:25 [dep TUN 17:00 — 95 min]
            // 17:00 TUN→CMN arr 19:30
            new FlightTemplate("AT512", "CMN", "ALG", LocalTime.of( 7,  0), 115, REG_ROI, "J", 162, 12),
            new FlightTemplate("AT513", "ALG", "CMN", LocalTime.of(10,  0), 115, REG_ROI, "J", 162, 12),
            new FlightTemplate("AT504", "CMN", "TUN", LocalTime.of(13,  0), 145, REG_ROI, "J", 162, 12),
            new FlightTemplate("AT505", "TUN", "CMN", LocalTime.of(17,  0), 150, REG_ROI, "J", 162, 12),

            // ══ CN-ROJ (B737 MAX 8): ORN + FRA double rotation ═══════════════════════
            // 07:30 CMN→ORN arr 09:30 [dep ORN 10:30 — 60 min]
            // 10:30 ORN→CMN arr 12:35 [dep CMN 14:00 — 85 min]
            // 14:00 CMN→FRA arr 18:30 [dep FRA 20:30 — 120 min]
            // 20:30 FRA→CMN arr 01:00+1
            new FlightTemplate("AT514", "CMN", "ORN", LocalTime.of( 7, 30), 120, REG_ROJ, "J", 162, 12),
            new FlightTemplate("AT515", "ORN", "CMN", LocalTime.of(10, 30), 125, REG_ROJ, "J", 162, 12),
            new FlightTemplate("AT235", "CMN", "FRA", LocalTime.of(14,  0), 270, REG_ROJ, "J", 162, 12),
            new FlightTemplate("AT236", "FRA", "CMN", LocalTime.of(20, 30), 270, REG_ROJ, "J", 162, 12),

            // ══ CN-ROK (B737 MAX 8): MAD + BCN double rotation ═══════════════════════
            // 08:00 CMN→MAD arr 09:50 [dep MAD 11:00 — 70 min]
            // 11:00 MAD→CMN arr 12:55 [dep CMN 14:30 — 95 min]
            // 14:30 CMN→BCN arr 16:50 [dep BCN 18:00 — 70 min]
            // 18:00 BCN→CMN arr 20:20
            new FlightTemplate("AT215", "CMN", "MAD", LocalTime.of( 8,  0), 110, REG_ROK, "J", 162, 12),
            new FlightTemplate("AT216", "MAD", "CMN", LocalTime.of(11,  0), 115, REG_ROK, "J", 162, 12),
            new FlightTemplate("AT245", "CMN", "BCN", LocalTime.of(14, 30), 140, REG_ROK, "J", 162, 12),
            new FlightTemplate("AT246", "BCN", "CMN", LocalTime.of(18,  0), 140, REG_ROK, "J", 162, 12),

            // ══ CN-ATU (ATR72-600): domestic triangle CMN/RAK/FEZ/AGA ═══════════════
            // 06:30 CMN→RAK arr 07:30 [dep RAK 08:30 — 60 min]
            // 08:30 RAK→CMN arr 09:30 [dep CMN 10:30 — 60 min]
            // 10:30 CMN→FEZ arr 11:25 [dep FEZ 12:30 — 65 min]
            // 12:30 FEZ→CMN arr 13:25 [dep CMN 15:00 — 95 min]
            // 15:00 CMN→AGA arr 16:20 [dep AGA 17:30 — 70 min]
            // 17:30 AGA→CMN arr 18:50
            new FlightTemplate("AT401", "CMN", "RAK", LocalTime.of( 6, 30),  60, REG_ATU, "J",  72,  0),
            new FlightTemplate("AT402", "RAK", "CMN", LocalTime.of( 8, 30),  60, REG_ATU, "J",  72,  0),
            new FlightTemplate("AT405", "CMN", "FEZ", LocalTime.of(10, 30),  55, REG_ATU, "J",  72,  0),
            new FlightTemplate("AT406", "FEZ", "CMN", LocalTime.of(12, 30),  55, REG_ATU, "J",  72,  0),
            new FlightTemplate("AT407", "CMN", "AGA", LocalTime.of(15,  0),  80, REG_ATU, "J",  72,  0),
            new FlightTemplate("AT408", "AGA", "CMN", LocalTime.of(17, 30),  80, REG_ATU, "J",  72,  0),

            // ══ CN-ATV (ATR72-600): AGA/RAK domestic + positioning ════════════════════
            // 07:00 CMN→AGA arr 08:20 [dep AGA 09:30 — 70 min]
            // 09:30 AGA→CMN arr 10:50 [dep CMN 12:00 — 70 min]
            // 12:00 CMN→RAK arr 13:00 [dep RAK 14:00 — 60 min]
            // 14:00 RAK→CMN arr 15:00 [dep CMN 22:00 — 420 min rest]
            // 22:00 CMN→RAK [P] arr 23:00 (overnight positioning)
            new FlightTemplate("AT403", "CMN", "AGA", LocalTime.of( 7,  0),  80, REG_ATV, "J",  72,  0),
            new FlightTemplate("AT404", "AGA", "CMN", LocalTime.of( 9, 30),  80, REG_ATV, "J",  72,  0),
            new FlightTemplate("AT409", "CMN", "RAK", LocalTime.of(12,  0),  60, REG_ATV, "J",  72,  0),
            new FlightTemplate("AT410", "RAK", "CMN", LocalTime.of(14,  0),  60, REG_ATV, "J",  72,  0),
            new FlightTemplate("AT950", "CMN", "RAK", LocalTime.of(22,  0),  60, REG_ATV, "P",   0,  0),

            // ══ CN-ATW (ATR72-600): OZZ + NDR domestic shuttle ════════════════════════
            // 07:00 CMN→OZZ arr 08:15 [dep OZZ 09:15 — 60 min]
            // 09:15 OZZ→CMN arr 10:30 [dep CMN 12:00 — 90 min]
            // 12:00 CMN→NDR arr 13:10 [dep NDR 14:10 — 60 min]
            // 14:10 NDR→CMN arr 15:20
            new FlightTemplate("AT411", "CMN", "OZZ", LocalTime.of( 7,  0),  75, REG_ATW, "J",  72,  0),
            new FlightTemplate("AT412", "OZZ", "CMN", LocalTime.of( 9, 15),  75, REG_ATW, "J",  72,  0),
            new FlightTemplate("AT421", "CMN", "NDR", LocalTime.of(12,  0),  70, REG_ATW, "J",  72,  0),
            new FlightTemplate("AT422", "NDR", "CMN", LocalTime.of(14, 10),  70, REG_ATW, "J",  72,  0),

            // ══ CN-ATX (ATR72-600): TTA + ERH domestic shuttle ════════════════════════
            // 08:00 CMN→TTA arr 09:30 [dep TTA 10:30 — 60 min]
            // 10:30 TTA→CMN arr 12:00 [dep CMN 13:00 — 60 min]
            // 13:00 CMN→ERH arr 14:05 [dep ERH 15:05 — 60 min]
            // 15:05 ERH→CMN arr 16:10
            new FlightTemplate("AT431", "CMN", "TTA", LocalTime.of( 8,  0),  90, REG_ATX, "J",  72,  0),
            new FlightTemplate("AT432", "TTA", "CMN", LocalTime.of(10, 30),  90, REG_ATX, "J",  72,  0),
            new FlightTemplate("AT441", "CMN", "ERH", LocalTime.of(13,  0),  65, REG_ATX, "J",  72,  0),
            new FlightTemplate("AT442", "ERH", "CMN", LocalTime.of(15,  5),  65, REG_ATX, "J",  72,  0),

            // ══ CN-ATY (ATR72-600): RAK + AGA + FEZ triple domestic shuttle ════════════
            // 06:30 CMN→RAK arr 07:30 [dep RAK 08:30 — 60 min]
            // 08:30 RAK→CMN arr 09:30 [dep CMN 11:00 — 90 min]
            // 11:00 CMN→AGA arr 12:20 [dep AGA 13:30 — 70 min]
            // 13:30 AGA→CMN arr 14:50 [dep CMN 16:00 — 70 min]
            // 16:00 CMN→FEZ arr 16:55 [dep FEZ 18:00 — 65 min]
            // 18:00 FEZ→CMN arr 18:55
            new FlightTemplate("AT413", "CMN", "RAK", LocalTime.of( 6, 30),  60, REG_ATY, "J",  72,  0),
            new FlightTemplate("AT414", "RAK", "CMN", LocalTime.of( 8, 30),  60, REG_ATY, "J",  72,  0),
            new FlightTemplate("AT415", "CMN", "AGA", LocalTime.of(11,  0),  80, REG_ATY, "J",  72,  0),
            new FlightTemplate("AT416", "AGA", "CMN", LocalTime.of(13, 30),  80, REG_ATY, "J",  72,  0),
            new FlightTemplate("AT417", "CMN", "FEZ", LocalTime.of(16,  0),  55, REG_ATY, "J",  72,  0),
            new FlightTemplate("AT418", "FEZ", "CMN", LocalTime.of(18,  0),  55, REG_ATY, "J",  72,  0),

            // ══ CN-ATZ (ATR72-600): AGA + FEZ domestic ════════════════════════════════
            // 09:00 CMN→AGA arr 10:20 [dep AGA 11:30 — 70 min]
            // 11:30 AGA→CMN arr 12:50 [dep CMN 14:00 — 70 min]
            // 14:00 CMN→FEZ arr 14:55 [dep FEZ 16:00 — 65 min]
            // 16:00 FEZ→CMN arr 16:55
            new FlightTemplate("AT419", "CMN", "AGA", LocalTime.of( 9,  0),  80, REG_ATZ, "J",  72,  0),
            new FlightTemplate("AT420", "AGA", "CMN", LocalTime.of(11, 30),  80, REG_ATZ, "J",  72,  0),
            new FlightTemplate("AT423", "CMN", "FEZ", LocalTime.of(14,  0),  55, REG_ATZ, "J",  72,  0),
            new FlightTemplate("AT424", "FEZ", "CMN", LocalTime.of(16,  0),  55, REG_ATZ, "J",  72,  0),

            // ══ CN-ATA (ATR72-600): FEZ + OZZ domestic ════════════════════════════════
            // 07:00 CMN→FEZ arr 07:55 [dep FEZ 09:00 — 65 min]
            // 09:00 FEZ→CMN arr 09:55 [dep CMN 11:00 — 65 min]
            // 11:00 CMN→OZZ arr 12:15 [dep OZZ 13:15 — 60 min]
            // 13:15 OZZ→CMN arr 14:30
            new FlightTemplate("AT425", "CMN", "FEZ", LocalTime.of( 7,  0),  55, REG_ATA, "J",  72,  0),
            new FlightTemplate("AT426", "FEZ", "CMN", LocalTime.of( 9,  0),  55, REG_ATA, "J",  72,  0),
            new FlightTemplate("AT427", "CMN", "OZZ", LocalTime.of(11,  0),  75, REG_ATA, "J",  72,  0),
            new FlightTemplate("AT428", "OZZ", "CMN", LocalTime.of(13, 15),  75, REG_ATA, "J",  72,  0),

            // ══ CN-ATB (ATR72-600): NDR + SMW domestic ════════════════════════════════
            // 07:30 CMN→NDR arr 08:40 [dep NDR 09:40 — 60 min]
            // 09:40 NDR→CMN arr 10:50 [dep CMN 12:00 — 70 min]
            // 12:00 CMN→SMW arr 13:40 [dep SMW 14:40 — 60 min]
            // 14:40 SMW→CMN arr 16:20
            new FlightTemplate("AT429", "CMN", "NDR", LocalTime.of( 7, 30),  70, REG_ATB, "J",  72,  0),
            new FlightTemplate("AT430", "NDR", "CMN", LocalTime.of( 9, 40),  70, REG_ATB, "J",  72,  0),
            new FlightTemplate("AT451", "CMN", "SMW", LocalTime.of(12,  0), 100, REG_ATB, "J",  72,  0),
            new FlightTemplate("AT452", "SMW", "CMN", LocalTime.of(14, 40), 100, REG_ATB, "J",  72,  0),

            // ══ CN-ATC (ATR72-600): RAK + AGA triple rotation ════════════════════════
            // 07:00 CMN→RAK arr 08:00 [dep RAK 09:00 — 60 min]
            // 09:00 RAK→CMN arr 10:00 [dep CMN 11:30 — 90 min]
            // 11:30 CMN→AGA arr 12:50 [dep AGA 14:00 — 70 min]
            // 14:00 AGA→CMN arr 15:20 [dep CMN 16:30 — 70 min]
            // 16:30 CMN→RAK arr 17:30 [dep RAK 18:30 — 60 min]
            // 18:30 RAK→CMN arr 19:30
            new FlightTemplate("AT433", "CMN", "RAK", LocalTime.of( 7,  0),  60, REG_ATC, "J",  72,  0),
            new FlightTemplate("AT434", "RAK", "CMN", LocalTime.of( 9,  0),  60, REG_ATC, "J",  72,  0),
            new FlightTemplate("AT435", "CMN", "AGA", LocalTime.of(11, 30),  80, REG_ATC, "J",  72,  0),
            new FlightTemplate("AT436", "AGA", "CMN", LocalTime.of(14,  0),  80, REG_ATC, "J",  72,  0),
            new FlightTemplate("AT437", "CMN", "RAK", LocalTime.of(16, 30),  60, REG_ATC, "J",  72,  0),
            new FlightTemplate("AT438", "RAK", "CMN", LocalTime.of(18, 30),  60, REG_ATC, "J",  72,  0)
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
        log.info("[FakeMV] Seeded {} legs across 5 days — {} aircraft — types: {}",
                allLegs.size(), FLEET.size(), byType);
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

        // 2. Randomly add delays to a small subset (at most 6 legs, 35% chance each)
        List<LegMv> candidates = new ArrayList<>(todayLegs);
        Collections.shuffle(candidates, random);
        int delayBudget = Math.min(6, Math.max(1, todayLegs.size() / 8));
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

    /**
     * Defensive guard: resolves any residual scheduling conflicts by ensuring
     * no aircraft operates two legs simultaneously.
     *
     * <p>Legs per aircraft are sorted chronologically. If a leg's STD falls before
     * the previous leg's STA plus the minimum turnaround, both STD/STA and ETD/ETA
     * are shifted forward until the gap is satisfied. The SCHEDULE is designed to be
     * conflict-free; this method is a last-resort safety net that logs a warning
     * whenever it has to intervene.
     *
     * @param legs all legs for a single day (may span multiple aircraft)
     * @return the same list, with any conflicting legs shifted in-place
     */
    private List<LegMv> resolveScheduleConflicts(List<LegMv> legs) {
        final int MIN_TURNAROUND_MINUTES = 45;

        legs.stream()
                .collect(Collectors.groupingBy(LegMv::getAircraftRegistration))
                .forEach((registration, aircraftLegs) -> {
                    aircraftLegs.sort(Comparator.comparing(LegMv::getStd));
                    LocalDateTime windowEnd = null;

                    for (LegMv leg : aircraftLegs) {
                        if (windowEnd != null) {
                            LocalDateTime minDep = windowEnd.plusMinutes(MIN_TURNAROUND_MINUTES);
                            if (leg.getStd().isBefore(minDep)) {
                                long shift = Duration.between(leg.getStd(), minDep).toMinutes();
                                log.warn("[FakeMV] {} schedule conflict on leg {} — shifting +{} min",
                                        registration, leg.getLegNo(), shift);
                                leg.setStd(leg.getStd().plusMinutes(shift));
                                leg.setSta(leg.getSta().plusMinutes(shift));
                                leg.setEtd(leg.getEtd().plusMinutes(shift));
                                leg.setEta(leg.getEta().plusMinutes(shift));
                            }
                        }
                        windowEnd = leg.getSta();
                    }
                });

        return legs;
    }

    private List<LegMv> generateLegsForDay(LocalDate date) {
        List<LegMv> legs = new ArrayList<>();
        // Epoch-day prefix guarantees unique legNo across all days with no collisions
        long dayBase = date.toEpochDay() * 100;

        for (int i = 0; i < SCHEDULE.size(); i++) {
            FlightTemplate t   = SCHEDULE.get(i);
            AirportRef     dep = AIRPORTS.get(t.depIata());
            AirportRef     arr = AIRPORTS.get(t.arrIata());
            AircraftRef    ac  = FLEET.get(t.aircraftReg());

            LocalDateTime std = date.atTime(t.std());
            LocalDateTime sta = std.plusMinutes(t.durationMin());

            // Load figures — cargo/positioning legs carry no pax
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
                    .cargoWeight(round1dp(isCargo
                            ? 8000 + random.nextDouble() * 14000
                            : 500  + random.nextDouble() *  4000))
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
        return resolveScheduleConflicts(legs);
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

        LocalDateTime now      = LocalDateTime.now();
        LocalDateTime etd      = leg.getEtd() != null ? leg.getEtd() : leg.getStd();
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

        log.debug("[FakeMV] Delay added — flight={} code={} duration={}min",
                leg.getFlightNumber(), entry[0], minutes);
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
