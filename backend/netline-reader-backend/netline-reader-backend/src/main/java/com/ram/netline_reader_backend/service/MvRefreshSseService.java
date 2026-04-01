package com.ram.netline_reader_backend.service;

import com.ram.netline_reader_backend.event.MvRefreshEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Manages Server-Sent Event (SSE) connections for the Gantt chart frontend.
 *
 * When a {@link MvRefreshEvent} is published (after a simulated or real MV refresh
 * that contains data changes), this service broadcasts a notification to all
 * connected browser clients so they can re-fetch the updated leg data.
 *
 * The SSE endpoint is {@code GET /api/legs/events}.
 */
@Service
@Slf4j
public class MvRefreshSseService {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    /**
     * Registers a new SSE client connection.
     * The emitter is automatically removed when the connection is closed or times out.
     */
    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            emitters.remove(emitter);
        });
        emitter.onError(e -> emitters.remove(emitter));
        log.info("[SSE] Client connected — active connections: {}", emitters.size());

        // Send a welcome ping so the client knows the connection is live
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            emitters.remove(emitter);
        }
        return emitter;
    }

    /**
     * Listens for MV refresh events and broadcasts them to all SSE clients.
     * Dead connections are cleaned up automatically.
     */
    @EventListener
    public void onMvRefresh(MvRefreshEvent event) {
        if (emitters.isEmpty()) return;

        Map<String, Object> payload = Map.of(
                "timestamp",    event.getOccurredAt().toString(),
                "changedCount", event.getChangedCount(),
                "hasChanges",   event.hasChanges()
        );

        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("mv-refresh").data(payload));
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        emitters.removeAll(dead);
        log.info("[SSE] mv-refresh broadcast — {} client(s) notified, {} dead connection(s) removed",
                emitters.size(), dead.size());
    }

    public int getActiveConnectionCount() {
        return emitters.size();
    }
}
