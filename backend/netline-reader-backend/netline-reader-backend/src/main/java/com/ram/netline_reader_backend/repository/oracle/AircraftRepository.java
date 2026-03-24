package com.ram.netline_reader_backend.repository.oracle;

import com.ram.netline_reader_backend.entity.oracle.Aircraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Read-only repository for {@link Aircraft} reference data (Oracle materialized view).
 *
 * Used for aircraft lookups and filtering by subtype in the Gantt view.
 * The primary key is the registration / tail number (e.g. "CN-RGT").
 */
@Repository
public interface AircraftRepository extends JpaRepository<Aircraft, String> {

    /** Find all aircraft of a specific subtype (e.g. "B737-800"). */
    List<Aircraft> findBySubType(String subType);
}
