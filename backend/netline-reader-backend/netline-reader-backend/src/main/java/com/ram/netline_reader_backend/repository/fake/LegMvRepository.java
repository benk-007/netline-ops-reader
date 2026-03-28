package com.ram.netline_reader_backend.repository.fake;

import com.ram.netline_reader_backend.entity.fake.LegMv;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Spring Data JPA repository for the fake Oracle MV simulation table.
 *
 * Only active in the {@code dev} profile — the {@code PostgresDataSourceConfig}
 * scans this package, and the only consumer ({@code FakeLegDataProvider}) is
 * itself {@code @Profile("dev")}.
 */
@Repository
public interface LegMvRepository extends JpaRepository<LegMv, Long>, JpaSpecificationExecutor<LegMv> {

    List<LegMv> findByOperationalDate(LocalDate date);

    List<LegMv> findByOperationalDateBetween(LocalDate startDate, LocalDate endDate);

    List<LegMv> findByFlightNumberAndOperationalDate(String flightNumber, LocalDate date);

    List<LegMv> findByDepAirportCodeAndOperationalDate(String iataCode, LocalDate date);

    List<LegMv> findByArrAirportCodeAndOperationalDate(String iataCode, LocalDate date);

    List<LegMv> findByAircraftRegistrationAndOperationalDate(String registration, LocalDate date);
}
