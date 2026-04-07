package com.ram.netline_reader_backend.enrichment;

import com.ram.netline_reader_backend.entity.oracle.Aircraft;

import java.util.Optional;

/**
 * Resolves enriched {@link Aircraft} data (max weight, cargo capacity) from a
 * tail-number registration.
 *
 * The Oracle MV already carries registration, subType, owner, and version. This
 * interface adds the fields the MV does NOT carry. Swap the implementation for a
 * real database or API without touching OracleLegDataProvider.
 *
 * Contract: never throw for an unknown registration — return {@link Optional#empty()}.
 */
public interface AircraftEnrichmentSource {

    /** @param registration  tail number, e.g. "CN-RGT"
     *  @return enriched Aircraft, or empty if the registration is unknown */
    Optional<Aircraft> findByRegistration(String registration);
}
