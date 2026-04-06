package com.ram.netline_reader_backend.repository.oracle;

import com.ram.netline_reader_backend.entity.oracle.MvLegRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Read-only repository for {@link MvLegRow} — the flat Oracle Netline MV.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  This is the PRIMARY data-access interface on the prod path.        │
 * │  OracleLegDataProvider reads MvLegRow records here, then           │
 * │  MvLegMapper converts them into structured Leg entity graphs.       │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * NEVER call save(), delete(), or any write method — the Oracle user
 * has read-only SELECT privileges on the materialized view.
 */
@Repository
public interface MvLegRowRepository extends JpaRepository<MvLegRow, Long> {

    /**
     * All legs for a specific operational date.
     * Primary query for the Gantt chart view.
     */
    List<MvLegRow> findByDayOfOrigin(LocalDate dayOfOrigin);

    /**
     * All legs within an inclusive date range.
     * Used for multi-day schedule views.
     */
    List<MvLegRow> findByDayOfOriginBetween(LocalDate startDate, LocalDate endDate);

    /**
     * All legs matching a full commercial flight identifier on a given date.
     *
     * The MV stores carrier and number separately (FN_CARRIER="AT", FN_NUMBER="201").
     * This query concatenates them so callers can pass "AT201" as a single string,
     * matching the contract of {@link LegRepository}.
     */
    @Query("SELECT r FROM MvLegRow r " +
           "WHERE CONCAT(r.fnCarrier, r.fnNumber) = :flightNumber " +
           "AND r.dayOfOrigin = :date")
    List<MvLegRow> findByFlightNumberAndDate(
            @Param("flightNumber") String flightNumber,
            @Param("date") LocalDate date);

    /**
     * All legs scheduled to depart from a given airport on a given date.
     * Matches against DEP_AP_SCHED (scheduled departure station).
     */
    List<MvLegRow> findByDepApSchedAndDayOfOrigin(String depApSched, LocalDate dayOfOrigin);

    /**
     * All legs scheduled to arrive at a given airport on a given date.
     * Matches against ARR_AP_SCHED (scheduled arrival station).
     */
    List<MvLegRow> findByArrApSchedAndDayOfOrigin(String arrApSched, LocalDate dayOfOrigin);

    /**
     * All legs operated by a specific aircraft on a given date.
     * Shows the aircraft's full daily rotation.
     */
    List<MvLegRow> findByAcRegistrationAndDayOfOrigin(String acRegistration, LocalDate dayOfOrigin);
}
