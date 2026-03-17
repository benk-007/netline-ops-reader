package com.ram.netline_reader_backend.controller;

import com.ram.netline_reader_backend.dto.SavedFilterRequestDTO;
import com.ram.netline_reader_backend.dto.SavedFilterResponseDTO;
import com.ram.netline_reader_backend.service.SavedFilterService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for saved filter profile management.
 *
 * Any authenticated user can manage their own filter profiles.
 * Access control at the URL level is set to "authenticated" in SecurityConfig.
 *
 * Endpoints:
 *   POST   /api/saved-filters             — create a new filter profile
 *   GET    /api/saved-filters/user/{uid}   — list a user's filter profiles
 *   PUT    /api/saved-filters/{id}         — update a filter profile
 *   DELETE /api/saved-filters/{id}         — delete a filter profile
 */
@RestController
@RequestMapping("/api/saved-filters")
@RequiredArgsConstructor
public class SavedFilterController {

    private final SavedFilterService savedFilterService;

    /** Create a new saved filter profile. */
    @PostMapping
    public ResponseEntity<SavedFilterResponseDTO> createSavedFilter(
            @Valid @RequestBody SavedFilterRequestDTO request) {
        SavedFilterResponseDTO created = savedFilterService.createSavedFilter(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** List all saved filter profiles for a given user. */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<SavedFilterResponseDTO>> getSavedFiltersByUserId(
            @PathVariable Long userId) {
        return ResponseEntity.ok(savedFilterService.getSavedFiltersByUserId(userId));
    }

    /** Update an existing saved filter profile. */
    @PutMapping("/{id}")
    public ResponseEntity<SavedFilterResponseDTO> updateSavedFilter(
            @PathVariable Long id,
            @Valid @RequestBody SavedFilterRequestDTO request) {
        return ResponseEntity.ok(savedFilterService.updateSavedFilter(id, request));
    }

    /** Delete a saved filter profile. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSavedFilter(@PathVariable Long id) {
        savedFilterService.deleteSavedFilter(id);
        return ResponseEntity.noContent().build();
    }
}
