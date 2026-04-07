package com.ram.netline_reader_backend.enrichment;

import com.ram.netline_reader_backend.entity.oracle.Aircraft;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

/**
 * In-memory implementation of {@link AircraftEnrichmentSource}.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  WHY STATIC?                                                             │
 * │                                                                          │
 * │  The Oracle MV already carries registration, subType, owner, and        │
 * │  version per row.  The fields the MV does NOT carry are maxWeight and   │
 * │  cargoCapacity — these are type-level constants, not operation-level     │
 * │  data, so they are safe to keep in a static registry keyed by subType.  │
 * │                                                                          │
 * │  LOOKUP STRATEGY                                                         │
 * │  We first try to match by individual registration (tail number) to      │
 * │  support any per-aircraft overrides.  If not found, we fall back to a   │
 * │  subType-level template keyed by type family (e.g. "B787-9").           │
 * │  If neither matches the caller receives Optional.empty() and the MV     │
 * │  stub (which already has subType/owner/version) is used as-is.          │
 * │                                                                          │
 * │  REPLACING THIS IMPLEMENTATION                                           │
 * │  Create a new @Component that implements AircraftEnrichmentSource and   │
 * │  inject it — OracleLegDataProvider depends only on the interface.       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Royal Air Maroc fleet coverage (MTOW/cargo figures are public IATA data):
 *   • Boeing 787-8     — CN-RGB, CN-RGC, CN-RGD, CN-RGE, CN-RGF
 *   • Boeing 787-9     — CN-RGT, CN-RGX, CN-RGY, CN-RGZ
 *   • Boeing 737-800   — CN-ROG, CN-ROH, CN-ROI, CN-ROJ, CN-ROK, CN-ROL,
 *                        CN-ROM, CN-RON, CN-ROO, CN-ROP, CN-ROQ, CN-ROR,
 *                        CN-ROS, CN-ROT, CN-ROU
 *   • Boeing 737 MAX 8 — CN-MAA, CN-MAB, CN-MAC, CN-MAD, CN-MAE, CN-MAF
 *   • ATR 72-600       — CN-COE, CN-COF, CN-COG, CN-COH, CN-COI
 */
@Component
public class StaticAircraftEnrichmentSource implements AircraftEnrichmentSource {

    // ── Per-registration lookup (highest priority) ────────────────────────
    private static final Map<String, Aircraft> BY_REGISTRATION = Map.ofEntries(

        // Boeing 787-8  (MTOW 227 930 kg, cargo ~54 000 kg)
        reg("CN-RGB", "B787-8",   "RAM", null,       227_930.0, 54_000.0),
        reg("CN-RGC", "B787-8",   "RAM", null,       227_930.0, 54_000.0),
        reg("CN-RGD", "B787-8",   "RAM", null,       227_930.0, 54_000.0),
        reg("CN-RGE", "B787-8",   "RAM", null,       227_930.0, 54_000.0),
        reg("CN-RGF", "B787-8",   "RAM", null,       227_930.0, 54_000.0),

        // Boeing 787-9  (MTOW 254 011 kg, cargo ~63 000 kg)
        reg("CN-RGT", "B787-9",   "RAM", null,       254_011.0, 63_000.0),
        reg("CN-RGX", "B787-9",   "RAM", null,       254_011.0, 63_000.0),
        reg("CN-RGY", "B787-9",   "RAM", null,       254_011.0, 63_000.0),
        reg("CN-RGZ", "B787-9",   "RAM", null,       254_011.0, 63_000.0),

        // Boeing 737-800  (MTOW 79 016 kg, cargo ~20 000 kg)
        reg("CN-ROG", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROH", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROI", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROJ", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROK", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROL", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROM", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-RON", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROO", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROP", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROQ", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROR", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROS", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROT", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),
        reg("CN-ROU", "B737-800", "RAM", "WINGLET",   79_016.0, 20_000.0),

        // Boeing 737 MAX 8  (MTOW 82 191 kg, cargo ~22 000 kg)
        reg("CN-MAA", "B737MAX8", "RAM", null,        82_191.0, 22_000.0),
        reg("CN-MAB", "B737MAX8", "RAM", null,        82_191.0, 22_000.0),
        reg("CN-MAC", "B737MAX8", "RAM", null,        82_191.0, 22_000.0),
        reg("CN-MAD", "B737MAX8", "RAM", null,        82_191.0, 22_000.0),
        reg("CN-MAE", "B737MAX8", "RAM", null,        82_191.0, 22_000.0),
        reg("CN-MAF", "B737MAX8", "RAM", null,        82_191.0, 22_000.0),

        // ATR 72-600  (MTOW 23 000 kg, cargo ~7 500 kg)
        reg("CN-COE", "ATR72-600","RAM", null,        23_000.0,  7_500.0),
        reg("CN-COF", "ATR72-600","RAM", null,        23_000.0,  7_500.0),
        reg("CN-COG", "ATR72-600","RAM", null,        23_000.0,  7_500.0),
        reg("CN-COH", "ATR72-600","RAM", null,        23_000.0,  7_500.0),
        reg("CN-COI", "ATR72-600","RAM", null,        23_000.0,  7_500.0)
    );

    /**
     * Subtype-level fallback templates — used when the exact registration is
     * not listed above.  Keys are the MV AC_SUBTYPE values (trimmed, upper-case).
     * Only maxWeight and cargoCapacity are set here; the rest come from the MV stub.
     */
    private static final Map<String, Aircraft> BY_SUBTYPE = Map.of(
        "B787-8",    Aircraft.builder().subType("B787-8")   .maxWeight(227_930.0).cargoCapacity(54_000.0).build(),
        "B787-9",    Aircraft.builder().subType("B787-9")   .maxWeight(254_011.0).cargoCapacity(63_000.0).build(),
        "B737-800",  Aircraft.builder().subType("B737-800") .maxWeight(79_016.0) .cargoCapacity(20_000.0).build(),
        "B737MAX8",  Aircraft.builder().subType("B737MAX8") .maxWeight(82_191.0) .cargoCapacity(22_000.0).build(),
        "B737-700",  Aircraft.builder().subType("B737-700") .maxWeight(70_080.0) .cargoCapacity(18_000.0).build(),
        "ATR72-600", Aircraft.builder().subType("ATR72-600").maxWeight(23_000.0) .cargoCapacity(7_500.0) .build(),
        "ATR72-500", Aircraft.builder().subType("ATR72-500").maxWeight(22_800.0) .cargoCapacity(7_200.0) .build()
    );

    // ── Convenience factory ───────────────────────────────────────────────

    private static Map.Entry<String, Aircraft> reg(
            String registration, String subType, String owner,
            String version, double maxWeight, double cargoCapacity) {
        return Map.entry(
                registration,
                Aircraft.builder()
                        .registration(registration)
                        .subType(subType)
                        .owner(owner)
                        .version(version)
                        .maxWeight(maxWeight)
                        .cargoCapacity(cargoCapacity)
                        .build()
        );
    }

    // ── AircraftEnrichmentSource ──────────────────────────────────────────

    /**
     * {@inheritDoc}
     *
     * Look-up order:
     *   1. Exact registration match  → full per-tail record
     *   2. SubType template match    → type-level weight/cargo only
     *   3. Missing                   → empty (caller uses MV stub)
     *
     * When merging a subType template, the caller is responsible for copying
     * registration / owner / version from the MV stub itself; this method
     * only returns the weight/cargo enrichment shell.
     */
    @Override
    public Optional<Aircraft> findByRegistration(String registration) {
        if (registration == null || registration.isBlank()) return Optional.empty();
        return Optional.ofNullable(BY_REGISTRATION.get(registration.toUpperCase()));
    }

    /**
     * Secondary look-up by subType — used when the exact registration is not
     * in the registry so the caller can still fill in maxWeight / cargoCapacity.
     *
     * @param subType MV AC_SUBTYPE value (case-insensitive)
     * @return a partial Aircraft template carrying only weight/capacity fields
     */
    public Optional<Aircraft> findBySubType(String subType) {
        if (subType == null || subType.isBlank()) return Optional.empty();
        return Optional.ofNullable(BY_SUBTYPE.get(subType.trim().toUpperCase()
                // normalise minor variants: "B737-800W" → "B737-800"
                .replace("W", "").replace("-ER", "").replace("ER", "")));
    }
}
