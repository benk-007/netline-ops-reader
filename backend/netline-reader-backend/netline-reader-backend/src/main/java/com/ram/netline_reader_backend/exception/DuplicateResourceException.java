package com.ram.netline_reader_backend.exception;

/**
 * Thrown when attempting to create a resource that already exists
 * (e.g. duplicate matricule). Mapped to HTTP 409 by {@link GlobalExceptionHandler}.
 */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
