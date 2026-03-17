package com.ram.netline_reader_backend.mapper;

import com.ram.netline_reader_backend.dto.SavedFilterRequestDTO;
import com.ram.netline_reader_backend.dto.SavedFilterResponseDTO;
import com.ram.netline_reader_backend.entity.SavedFilter;
import com.ram.netline_reader_backend.entity.User;
import org.springframework.stereotype.Component;

import java.util.Collections;

/**
 * Maps between {@link SavedFilter} entities and DTOs.
 */
@Component
public class SavedFilterMapper {

    /** Converts a SavedFilter entity to the API response DTO. */
    public SavedFilterResponseDTO toResponseDTO(SavedFilter filter) {
        return SavedFilterResponseDTO.builder()
                .id(filter.getId())
                .name(filter.getName())
                .depAirport(filter.getDepAirport())
                .arrAirport(filter.getArrAirport())
                .serviceType(filter.getServiceType())
                .aircraftType(filter.getAircraftType())
                .flightNumber(filter.getFlightNumber())
                .build();
    }

    /** Creates a new SavedFilter entity from a request DTO, linked to the given user. */
    public SavedFilter toEntity(SavedFilterRequestDTO dto, User user) {
        return SavedFilter.builder()
                .name(dto.getName())
                .depAirport(dto.getDepAirport() != null ? dto.getDepAirport() : Collections.emptyList())
                .arrAirport(dto.getArrAirport() != null ? dto.getArrAirport() : Collections.emptyList())
                .serviceType(dto.getServiceType() != null ? dto.getServiceType() : Collections.emptyList())
                .aircraftType(dto.getAircraftType() != null ? dto.getAircraftType() : Collections.emptyList())
                .flightNumber(dto.getFlightNumber() != null ? dto.getFlightNumber() : Collections.emptyList())
                .user(user)
                .build();
    }
}
