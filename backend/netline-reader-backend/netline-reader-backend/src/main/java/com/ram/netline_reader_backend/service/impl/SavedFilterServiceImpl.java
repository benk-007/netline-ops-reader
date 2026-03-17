package com.ram.netline_reader_backend.service.impl;

import com.ram.netline_reader_backend.dto.SavedFilterRequestDTO;
import com.ram.netline_reader_backend.dto.SavedFilterResponseDTO;
import com.ram.netline_reader_backend.entity.SavedFilter;
import com.ram.netline_reader_backend.entity.User;
import com.ram.netline_reader_backend.exception.ResourceNotFoundException;
import com.ram.netline_reader_backend.mapper.SavedFilterMapper;
import com.ram.netline_reader_backend.repository.SavedFilterRepository;
import com.ram.netline_reader_backend.repository.UserRepository;
import com.ram.netline_reader_backend.service.SavedFilterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implementation of {@link SavedFilterService}.
 * Validates user existence before creating filters to prevent orphan records.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SavedFilterServiceImpl implements SavedFilterService {

    private final SavedFilterRepository savedFilterRepository;
    private final UserRepository userRepository;
    private final SavedFilterMapper savedFilterMapper;

    @Override
    public SavedFilterResponseDTO createSavedFilter(SavedFilterRequestDTO request) {
        // Ensure the owning user exists before creating the filter
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "User not found with id: " + request.getUserId()));

        SavedFilter filter = savedFilterMapper.toEntity(request, user);
        SavedFilter saved = savedFilterRepository.save(filter);
        return savedFilterMapper.toResponseDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavedFilterResponseDTO> getSavedFiltersByUserId(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found with id: " + userId);
        }
        return savedFilterRepository.findByUserId(userId).stream()
                .map(savedFilterMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public SavedFilterResponseDTO updateSavedFilter(Long id, SavedFilterRequestDTO request) {
        SavedFilter filter = savedFilterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Saved filter not found with id: " + id));

        // Rebuild the entity with updated values, keeping the same user
        SavedFilter updatedFilter = savedFilterMapper.toEntity(request, filter.getUser());
        updatedFilter.setId(id);
        SavedFilter saved = savedFilterRepository.save(updatedFilter);
        return savedFilterMapper.toResponseDTO(saved);
    }

    @Override
    public void deleteSavedFilter(Long id) {
        if (!savedFilterRepository.existsById(id)) {
            throw new ResourceNotFoundException("Saved filter not found with id: " + id);
        }
        savedFilterRepository.deleteById(id);
    }
}
