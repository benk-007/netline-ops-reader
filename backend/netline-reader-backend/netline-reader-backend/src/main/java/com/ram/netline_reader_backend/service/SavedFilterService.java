package com.ram.netline_reader_backend.service;

import com.ram.netline_reader_backend.dto.SavedFilterRequestDTO;
import com.ram.netline_reader_backend.dto.SavedFilterResponseDTO;

import java.util.List;

/**
 * Service contract for saved filter profile operations.
 * Available to any authenticated user (for their own profiles).
 */
public interface SavedFilterService {

    /** Create a new saved filter profile for the specified user. */
    SavedFilterResponseDTO createSavedFilter(SavedFilterRequestDTO request);

    /** Get all saved filter profiles for a given user. */
    List<SavedFilterResponseDTO> getSavedFiltersByUserId(Long userId);

    /** Update an existing saved filter profile. */
    SavedFilterResponseDTO updateSavedFilter(Long id, SavedFilterRequestDTO request);

    /** Delete a saved filter profile by ID. */
    void deleteSavedFilter(Long id);
}
