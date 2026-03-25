package com.ram.netline_reader_backend.mapper;

import java.util.Collections;
import java.util.List;

import org.springframework.stereotype.Component;

import com.ram.netline_reader_backend.dto.SavedFilterRequestDTO;
import com.ram.netline_reader_backend.dto.SavedFilterResponseDTO;
import com.ram.netline_reader_backend.entity.SavedFilter;
import com.ram.netline_reader_backend.entity.User;

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
                .depAirport(safeList(filter.getDepAirport()))
                .arrAirport(safeList(filter.getArrAirport()))
                .serviceType(safeList(filter.getServiceType()))
                .aircraftType(safeList(filter.getAircraftType()))
                .flightNumber(safeList(filter.getFlightNumber()))
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
    private List<String> safeList(List<String> list) {
    return list != null ? List.copyOf(list) : Collections.emptyList();
}
}
