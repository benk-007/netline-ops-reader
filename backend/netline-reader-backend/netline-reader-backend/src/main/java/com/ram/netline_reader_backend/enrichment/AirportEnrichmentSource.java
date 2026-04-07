package com.ram.netline_reader_backend.enrichment;

import com.ram.netline_reader_backend.entity.oracle.Airport;

import java.util.Optional;

/**
 * Resolves enriched {@link Airport} data (name, city, timezone, coordinates)
 * from a raw IATA code.
 *
 * The Oracle MV only carries IATA codes, not airport metadata. This interface
 * decouples the enrichment source from the mapping pipeline so it can later be
 * swapped for a database or external API without touching OracleLegDataProvider.
 *
 * Contract: never throw for an unknown code — return {@link Optional#empty()}.
 */
public interface AirportEnrichmentSource {

    /** @param iataCode  3-letter IATA code, e.g. "CMN"
     *  @return enriched Airport, or empty if the code is not in the dataset */
    Optional<Airport> findByIataCode(String iataCode);
}
