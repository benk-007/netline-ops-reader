package com.ram.netline_reader_backend.event;

import org.springframework.context.ApplicationEvent;

import java.time.Instant;

/**
 * Published whenever the materialized view data changes after a refresh cycle.
 *
 * dev  — fired by {@link com.ram.netline_reader_backend.provider.fake.FakeMvRefreshJob}
 *         when checksum differs after the scheduled PostgreSQL leg_mv update.
 * prod — can be fired by an Oracle change notification listener (future work).
 *
 * Consumers:
 *   - {@code LegServiceImpl}      → evicts all leg caches
 *   - {@code MvRefreshSseService} → pushes update to connected browser clients
 */
public class MvRefreshEvent extends ApplicationEvent {

    private final int changedCount;
    private final Instant occurredAt;

    public MvRefreshEvent(Object source, int changedCount) {
        super(source);
        this.changedCount = changedCount;
        this.occurredAt   = Instant.now();
    }

    /** Number of leg records that changed during this refresh. */
    public int getChangedCount() {
        return changedCount;
    }

    /** Wall-clock time the refresh completed. */
    public Instant getOccurredAt() {
        return occurredAt;
    }

    public boolean hasChanges() {
        return changedCount > 0;
    }
}
