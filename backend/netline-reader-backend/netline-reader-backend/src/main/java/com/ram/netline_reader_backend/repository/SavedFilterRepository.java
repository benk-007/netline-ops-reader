package com.ram.netline_reader_backend.repository;

import com.ram.netline_reader_backend.entity.SavedFilter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * JPA repository for {@link SavedFilter} entities.
 * Provides CRUD + lookup by owning user.
 */
@Repository
public interface SavedFilterRepository extends JpaRepository<SavedFilter, Long> {

    /** Find all saved filter profiles belonging to a specific user. */
    List<SavedFilter> findByUserId(Long userId);
}
