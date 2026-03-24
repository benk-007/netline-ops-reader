package com.ram.netline_reader_backend.repository.oracle;

import com.ram.netline_reader_backend.entity.oracle.Airport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Read-only repository for {@link Airport} reference data (Oracle materialized view).
 *
 * Used mainly for airport lookups and autocomplete in the frontend filter panel.
 * The primary key is the IATA code (e.g. "CMN", "CDG").
 */
@Repository
public interface AirportRepository extends JpaRepository<Airport, String> {

    /** Search airports by partial name match (case-insensitive). */
    List<Airport> findByFullNameContainingIgnoreCase(String name);
}
