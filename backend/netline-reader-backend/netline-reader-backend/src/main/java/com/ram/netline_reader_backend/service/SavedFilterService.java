package com.ram.netline_reader_backend.service;

import com.ram.netline_reader_backend.dto.SavedFilterRequestDTO;
import com.ram.netline_reader_backend.dto.SavedFilterResponseDTO;

import java.util.List;

/**
 * Service contract for saved filter profile operations.
 * All methods require a keycloakId to enforce ownership.
 */
public interface SavedFilterService {

    /** Create a new saved filter profile for the user identified by keycloakId. */
    SavedFilterResponseDTO createSavedFilter(String keycloakId, SavedFilterRequestDTO request);

    /** Get all saved filter profiles for the user identified by keycloakId. */
    List<SavedFilterResponseDTO> getSavedFiltersForKeycloakUser(String keycloakId);

    /** Update an existing saved filter profile (ownership enforced via keycloakId). */
    SavedFilterResponseDTO updateSavedFilter(String keycloakId, Long id, SavedFilterRequestDTO request);

    /** Delete a saved filter profile by ID (ownership enforced via keycloakId). */
    void deleteSavedFilter(String keycloakId, Long id);
}
