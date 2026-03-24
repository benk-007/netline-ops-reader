package com.ram.netline_reader_backend.repository.oracle;

import com.ram.netline_reader_backend.entity.oracle.Leg;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Read-only repository for {@link Leg} entities (Oracle materialized view).
 *
 * This repository should ONLY be used for SELECT queries.
 * Never call save(), delete(), or any write operation — the Oracle
 * datasource user has read-only privileges.
 */
@Repository
public interface LegRepository extends JpaRepository<Leg, Long> {

    /**
     * Find all legs for a specific operational date.
     * This is the primary query used by the Gantt chart view.
     */
    List<Leg> findByOperationalDate(LocalDate operationalDate);

    /**
     * Find all legs for a date range (inclusive).
     * Used for multi-day schedule views and reporting.
     */
    List<Leg> findByOperationalDateBetween(LocalDate startDate, LocalDate endDate);

    /** Find all legs for a specific flight number on a given date. */
    List<Leg> findByFlightNumberAndOperationalDate(String flightNumber, LocalDate operationalDate);

    /** Find all legs departing from a specific airport on a given date. */
    @Query("SELECT l FROM Leg l WHERE l.departureAirport.iataCode = :iataCode AND l.operationalDate = :date")
    List<Leg> findByDepartureAirportAndDate(@Param("iataCode") String iataCode, @Param("date") LocalDate date);

    /** Find all legs arriving at a specific airport on a given date. */
    @Query("SELECT l FROM Leg l WHERE l.arrivalAirport.iataCode = :iataCode AND l.operationalDate = :date")
    List<Leg> findByArrivalAirportAndDate(@Param("iataCode") String iataCode, @Param("date") LocalDate date);

    /** Find all legs operated by a specific aircraft on a given date. */
    @Query("SELECT l FROM Leg l WHERE l.aircraft.registration = :registration AND l.operationalDate = :date")
    List<Leg> findByAircraftAndDate(@Param("registration") String registration, @Param("date") LocalDate date);
}
