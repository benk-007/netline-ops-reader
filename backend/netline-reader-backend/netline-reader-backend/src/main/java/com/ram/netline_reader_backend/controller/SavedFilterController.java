package com.ram.netline_reader_backend.controller;

import com.ram.netline_reader_backend.dto.SavedFilterRequestDTO;
import com.ram.netline_reader_backend.dto.SavedFilterResponseDTO;
import com.ram.netline_reader_backend.service.SavedFilterService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for saved filter profile management.
 *
 * All endpoints derive the current user from the JWT token (sub claim).
 * Users can only access their own filters — ownership is enforced server-side.
 *
 * Endpoints:
 *   POST   /api/saved-filters         — create a filter for the authenticated user
 *   GET    /api/saved-filters/me      — list the authenticated user's filters
 *   PUT    /api/saved-filters/{id}    — update a filter (ownership enforced)
 *   DELETE /api/saved-filters/{id}    — delete a filter (ownership enforced)
 */
@RestController
@RequestMapping("/api/saved-filters")
@RequiredArgsConstructor
public class SavedFilterController {

    private final SavedFilterService savedFilterService;

    /** Create a new saved filter profile for the authenticated user. */
    @PostMapping
    public ResponseEntity<SavedFilterResponseDTO> createSavedFilter(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SavedFilterRequestDTO request) {
        String keycloakId = jwt.getSubject();
        SavedFilterResponseDTO created = savedFilterService.createSavedFilter(keycloakId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** List all saved filter profiles for the authenticated user. */
    @GetMapping("/me")
    public ResponseEntity<List<SavedFilterResponseDTO>> getMySavedFilters(
            @AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getSubject();
        return ResponseEntity.ok(savedFilterService.getSavedFiltersForKeycloakUser(keycloakId));
    }

    /** Update an existing saved filter profile (ownership enforced). */
    @PutMapping("/{id}")
    public ResponseEntity<SavedFilterResponseDTO> updateSavedFilter(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @Valid @RequestBody SavedFilterRequestDTO request) {
        String keycloakId = jwt.getSubject();
        return ResponseEntity.ok(savedFilterService.updateSavedFilter(keycloakId, id, request));
    }

    /** Delete a saved filter profile (ownership enforced). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSavedFilter(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id) {
        String keycloakId = jwt.getSubject();
        savedFilterService.deleteSavedFilter(keycloakId, id);
        return ResponseEntity.noContent().build();
    }
}
