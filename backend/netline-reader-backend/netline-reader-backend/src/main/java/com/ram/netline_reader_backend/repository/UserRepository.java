package com.ram.netline_reader_backend.repository;

import com.ram.netline_reader_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * JPA repository for {@link User} entities.
 * Provides CRUD + custom queries for matricule lookups.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /** Find a user by their unique employee matricule. */
    Optional<User> findByMatricule(String matricule);

    /** Check if a user with the given matricule already exists. */
    boolean existsByMatricule(String matricule);
}
