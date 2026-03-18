package com.ram.netline_reader_backend.service.impl;

import com.ram.netline_reader_backend.dto.SavedFilterRequestDTO;
import com.ram.netline_reader_backend.dto.SavedFilterResponseDTO;
import com.ram.netline_reader_backend.entity.SavedFilter;
import com.ram.netline_reader_backend.entity.User;
import com.ram.netline_reader_backend.exception.ResourceNotFoundException;
import com.ram.netline_reader_backend.mapper.SavedFilterMapper;
import com.ram.netline_reader_backend.repository.SavedFilterRepository;
import com.ram.netline_reader_backend.service.SavedFilterService;
import com.ram.netline_reader_backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of {@link SavedFilterService}.
 * Every operation resolves the authenticated user via keycloakId and
 * enforces that users can only access their own filters.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SavedFilterServiceImpl implements SavedFilterService {

    private final SavedFilterRepository savedFilterRepository;
    private final UserService userService;
    private final SavedFilterMapper savedFilterMapper;

    @Override
    public SavedFilterResponseDTO createSavedFilter(String keycloakId, SavedFilterRequestDTO request) {
        User user = userService.getUserByKeycloakId(keycloakId);
        SavedFilter filter = savedFilterMapper.toEntity(request, user);
        SavedFilter saved = savedFilterRepository.save(filter);
        return savedFilterMapper.toResponseDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavedFilterResponseDTO> getSavedFiltersForKeycloakUser(String keycloakId) {
        User user = userService.getUserByKeycloakId(keycloakId);
        return savedFilterRepository.findByUserId(user.getId()).stream()
                .map(savedFilterMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public SavedFilterResponseDTO updateSavedFilter(String keycloakId, Long id, SavedFilterRequestDTO request) {
        User user = userService.getUserByKeycloakId(keycloakId);
        SavedFilter filter = savedFilterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Saved filter not found with id: " + id));

        // Ownership check
        if (!filter.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not own this filter");
        }

        SavedFilter updatedFilter = savedFilterMapper.toEntity(request, user);
        updatedFilter.setId(id);
        SavedFilter saved = savedFilterRepository.save(updatedFilter);
        return savedFilterMapper.toResponseDTO(saved);
    }

    @Override
    public void deleteSavedFilter(String keycloakId, Long id) {
        User user = userService.getUserByKeycloakId(keycloakId);
        SavedFilter filter = savedFilterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Saved filter not found with id: " + id));

        // Ownership check
        if (!filter.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not own this filter");
        }

        savedFilterRepository.deleteById(id);
    }
}
