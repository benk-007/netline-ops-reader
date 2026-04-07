package com.ram.netline_reader_backend.enrichment;

import com.ram.netline_reader_backend.entity.oracle.Airport;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

/**
 * Static in-memory airport registry covering the full RAM network.
 *
 * The Oracle MV only stores raw IATA codes — no airport names, time-zones, or
 * coordinates. This registry enriches those codes at mapping time without any
 * database call. To replace it with a real source, implement
 * {@link AirportEnrichmentSource} in a new @Component and remove this one.
 */
@Component
public class StaticAirportEnrichmentSource implements AirportEnrichmentSource {

    // Timezone constants — avoids repeated string literals (SonarLint java:S1192)
    private static final String TZ_MOROCCO    = "Africa/Casablanca";
    private static final String TZ_FRANCE     = "Europe/Paris";
    private static final String TZ_SPAIN      = "Europe/Madrid";
    private static final String TZ_UK         = "Europe/London";
    private static final String TZ_GERMANY    = "Europe/Berlin";
    private static final String TZ_SWITZERLAND= "Europe/Zurich";
    private static final String TZ_ITALY      = "Europe/Rome";
    private static final String TZ_PORTUGAL   = "Europe/Lisbon";
    private static final String TZ_NY         = "America/New_York";
    private static final String TZ_TORONTO    = "America/Toronto";

    private static final Map<String, Airport> AIRPORTS = Map.ofEntries(

        // Morocco — domestic
        ap("CMN", "Mohammed V International Airport",                   "Casablanca",   TZ_MOROCCO,   33.3675,  -7.5900),
        ap("RBA", "Rabat–Salé Airport",                                 "Rabat",        TZ_MOROCCO,    34.0515,  -6.7515),
        ap("RAK", "Marrakech Menara Airport",                           "Marrakech",    TZ_MOROCCO,    31.6069,  -8.0363),
        ap("AGA", "Agadir Al Massira Airport",                          "Agadir",       TZ_MOROCCO,    30.3250,  -9.4130),
        ap("FEZ", "Fes–Saïss Airport",                                  "Fes",          TZ_MOROCCO,    33.9272,  -4.9778),
        ap("OUD", "Angads Airport",                                     "Oujda",        TZ_MOROCCO,    34.7872,  -1.9240),
        ap("TNG", "Ibn Batouta Airport",                                "Tangier",      TZ_MOROCCO,    35.7269,  -5.9169),
        ap("NDR", "Nador International Airport",                        "Nador",        TZ_MOROCCO,    34.9889,  -3.0282),
        ap("TTU", "Sania Ramel Airport",                                "Tetouan",      TZ_MOROCCO,    35.5944,  -5.3200),
        ap("ERH", "Moulay Ali Cherif Airport",                          "Errachidia",   TZ_MOROCCO,    31.9475,  -4.3983),
        ap("OZZ", "Ouarzazate Airport",                                 "Ouarzazate",   TZ_MOROCCO,    30.9391,  -6.9094),
        ap("ESU", "Mogador Airport",                                    "Essaouira",    TZ_MOROCCO,    31.3975,  -9.6817),
        ap("VIL", "Dakhla Airport",                                     "Dakhla",       TZ_MOROCCO,    23.7183, -15.9320),
        ap("EUN", "Hassan I Airport",                                   "Laayoune",     TZ_MOROCCO,    27.1517, -13.2192),
        ap("TFN", "Tantan Airport",                                     "Tantan",       TZ_MOROCCO,    28.4482, -11.1613),

        // France
        ap("CDG", "Charles de Gaulle Airport",                          "Paris",        TZ_FRANCE,     49.0097,   2.5479),
        ap("ORY", "Paris Orly Airport",                                 "Paris",        TZ_FRANCE,     48.7233,   2.3794),
        ap("LYS", "Lyon–Saint-Exupéry Airport",                        "Lyon",         TZ_FRANCE,     45.7256,   5.0811),
        ap("MRS", "Marseille Provence Airport",                         "Marseille",    TZ_FRANCE,     43.4393,   5.2214),
        ap("TLS", "Toulouse–Blagnac Airport",                           "Toulouse",     TZ_FRANCE,     43.6290,   1.3638),
        ap("NCE", "Nice Côte d'Azur Airport",                          "Nice",         TZ_FRANCE,     43.6584,   7.2159),
        ap("BOD", "Bordeaux–Mérignac Airport",                         "Bordeaux",     TZ_FRANCE,     44.8283,  -0.7156),
        ap("NTE", "Nantes Atlantique Airport",                          "Nantes",       TZ_FRANCE,     47.1532,  -1.6108),
        ap("LIL", "Lille Airport",                                      "Lille",        TZ_FRANCE,     50.5636,   3.0894),
        ap("SXB", "Strasbourg Airport",                                 "Strasbourg",   TZ_FRANCE,     48.5383,   7.6283),
        ap("MPL", "Montpellier–Méditerranée Airport",                  "Montpellier",  TZ_FRANCE,     43.5762,   3.9630),

        // Spain
        ap("MAD", "Adolfo Suárez Madrid–Barajas Airport",              "Madrid",       TZ_SPAIN,      40.4936,  -3.5668),
        ap("BCN", "Barcelona–El Prat Airport",                          "Barcelona",    TZ_SPAIN,      41.2971,   2.0785),
        ap("AGP", "Málaga–Costa del Sol Airport",                      "Malaga",       TZ_SPAIN,      36.6749,  -4.4991),
        ap("PMI", "Palma de Mallorca Airport",                          "Palma",        TZ_SPAIN,      39.5517,   2.7388),
        ap("VLC", "Valencia Airport",                                   "Valencia",     TZ_SPAIN,      39.4893,  -0.4816),
        ap("SVQ", "Seville Airport",                                    "Seville",      TZ_SPAIN,      37.4180,  -5.8931),

        // United Kingdom
        ap("LHR", "Heathrow Airport",                                   "London",       TZ_UK,         51.4775,  -0.4614),
        ap("LGW", "Gatwick Airport",                                    "London",       TZ_UK,         51.1481,  -0.1903),
        ap("MAN", "Manchester Airport",                                 "Manchester",   TZ_UK,         53.3537,  -2.2750),

        // Belgium / Netherlands
        ap("BRU", "Brussels Airport",                                   "Brussels",     "Europe/Brussels",     50.9014,   4.4844),
        ap("AMS", "Amsterdam Airport Schiphol",                         "Amsterdam",    "Europe/Amsterdam",    52.3086,   4.7639),

        // Germany
        ap("FRA", "Frankfurt Airport",                                  "Frankfurt",    TZ_GERMANY,    50.0379,   8.5622),
        ap("DUS", "Düsseldorf Airport",                                 "Düsseldorf",   TZ_GERMANY,    51.2895,   6.7668),
        ap("MUC", "Munich Airport",                                     "Munich",       TZ_GERMANY,    48.3538,  11.7861),
        ap("BER", "Berlin Brandenburg Airport",                         "Berlin",       TZ_GERMANY,    52.3667,  13.5033),
        ap("HAM", "Hamburg Airport",                                    "Hamburg",      TZ_GERMANY,    53.6304,   9.9882),

        // Switzerland
        ap("GVA", "Geneva Airport",                                     "Geneva",       TZ_SWITZERLAND, 46.2380,   6.1089),
        ap("ZRH", "Zurich Airport",                                     "Zurich",       TZ_SWITZERLAND, 47.4647,   8.5492),

        // Italy
        ap("FCO", "Leonardo da Vinci–Fiumicino Airport",               "Rome",         TZ_ITALY,      41.7999,  12.2462),
        ap("MXP", "Milan Malpensa Airport",                             "Milan",        TZ_ITALY,      45.6306,   8.7281),

        // Portugal
        ap("LIS", "Humberto Delgado Airport",                           "Lisbon",       TZ_PORTUGAL,   38.7742,  -9.1342),
        ap("OPO", "Francisco Sá Carneiro Airport",                     "Porto",        TZ_PORTUGAL,   41.2481,  -8.6814),

        // Scandinavia
        ap("CPH", "Copenhagen Airport",                                 "Copenhagen",   "Europe/Copenhagen",   55.6180,  12.6561),
        ap("ARN", "Stockholm Arlanda Airport",                          "Stockholm",    "Europe/Stockholm",    59.6519,  17.9186),

        // Greece
        ap("ATH", "Athens International Airport",                       "Athens",       "Europe/Athens",       37.9364,  23.9445),

        // North America
        ap("JFK", "John F. Kennedy International Airport",              "New York",     TZ_NY,         40.6413, -73.7781),
        ap("MIA", "Miami International Airport",                        "Miami",        TZ_NY,         25.7959, -80.2870),
        ap("YUL", "Montréal–Trudeau International Airport",             "Montreal",     TZ_TORONTO,    45.4657, -73.7449),
        ap("YYZ", "Toronto Pearson International Airport",              "Toronto",      TZ_TORONTO,    43.6777, -79.6248),
        ap("IAD", "Washington Dulles International Airport",            "Washington",   TZ_NY,         38.9531, -77.4565),

        // Middle East / Gulf
        ap("DXB", "Dubai International Airport",                        "Dubai",        "Asia/Dubai",          25.2532,  55.3657),
        ap("DOH", "Hamad International Airport",                        "Doha",         "Asia/Qatar",          25.2609,  51.6138),
        ap("AUH", "Abu Dhabi International Airport",                    "Abu Dhabi",    "Asia/Dubai",          24.4330,  54.6511),
        ap("BEY", "Beirut–Rafic Hariri International Airport",         "Beirut",       "Asia/Beirut",         33.8209,  35.4884),
        ap("CAI", "Cairo International Airport",                        "Cairo",        "Africa/Cairo",        30.1219,  31.4056),

        // North Africa
        ap("TUN", "Tunis-Carthage International Airport",               "Tunis",        "Africa/Tunis",        36.8510,  10.2272),
        ap("ALG", "Houari Boumediene Airport",                          "Algiers",      "Africa/Algiers",      36.6910,   3.2154),
        ap("TIP", "Mitiga International Airport",                       "Tripoli",      "Africa/Tripoli",      32.8945,  13.2760),

        // West Africa
        ap("DKR", "Blaise Diagne International Airport",                "Dakar",        "Africa/Dakar",        14.6706, -17.0729),
        ap("ABJ", "Port Bouet Airport",                                 "Abidjan",      "Africa/Abidjan",       5.2613,  -3.9263),
        ap("ACC", "Kotoka International Airport",                       "Accra",        "Africa/Accra",         5.6052,  -0.1668),
        ap("LOS", "Murtala Muhammed International Airport",             "Lagos",        "Africa/Lagos",         6.5774,   3.3211),
        ap("BKO", "Modibo Keïta International Airport",                "Bamako",       "Africa/Bamako",       12.5335,  -7.9499),
        ap("OUA", "Thomas Sankara International Airport",               "Ouagadougou",  "Africa/Ouagadougou",  12.3532,  -1.5124),
        ap("COO", "Cadjehoun Airport",                                  "Cotonou",      "Africa/Porto-Novo",    6.3572,   2.3845),
        ap("NIM", "Diori Hamani International Airport",                 "Niamey",       "Africa/Niamey",       13.4815,   2.1836),
        ap("CKY", "Conakry International Airport",                      "Conakry",      "Africa/Conakry",       9.5769, -13.6120),
        ap("NKC", "Nouakchott–Oumtounsy International Airport",        "Nouakchott",   "Africa/Nouakchott",   18.3132, -15.9698),
        ap("BJL", "Banjul International Airport",                       "Banjul",       "Africa/Banjul",       13.3380, -16.6522),

        // Central & East Africa
        ap("DLA", "Douala International Airport",                       "Douala",       "Africa/Douala",        4.0061,   9.7195),
        ap("NSI", "Yaoundé Nsimalen International Airport",            "Yaoundé",      "Africa/Douala",        3.7226,  11.5533),
        ap("LBV", "Libreville International Airport",                   "Libreville",   "Africa/Libreville",    0.4586,   9.4122),
        ap("NBO", "Jomo Kenyatta International Airport",                "Nairobi",      "Africa/Nairobi",      -1.3192,  36.9275),
        ap("ADD", "Addis Ababa Bole International Airport",             "Addis Ababa",  "Africa/Addis_Ababa",   8.9779,  38.7993),
        ap("DAR", "Julius Nyerere International Airport",               "Dar es Salaam","Africa/Dar_es_Salaam",-6.8781,  39.2026),

        // Southern Africa / Indian Ocean
        ap("JNB", "OR Tambo International Airport",                     "Johannesburg", "Africa/Johannesburg", -26.1392, 28.2460),
        ap("MRU", "Sir Seewoosagur Ramgoolam International Airport",    "Mauritius",    "Indian/Mauritius",    -20.4302, 57.6836)
    );

    private static Map.Entry<String, Airport> ap(
            String iata, String fullName, String city, String timeZone, double lat, double lon) {
        return Map.entry(iata, Airport.builder()
                .iataCode(iata).fullName(fullName).city(city)
                .timeZone(timeZone).latitude(lat).longitude(lon)
                .build());
    }

    @Override
    public Optional<Airport> findByIataCode(String iataCode) {
        if (iataCode == null || iataCode.isBlank()) return Optional.empty();
        return Optional.ofNullable(AIRPORTS.get(iataCode.toUpperCase()));
    }
}
