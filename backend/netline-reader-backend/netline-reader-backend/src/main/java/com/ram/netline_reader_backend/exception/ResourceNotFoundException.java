package com.ram.netline_reader_backend.exception;

/**
 * Thrown when a requested resource (user, saved filter, etc.) does not exist.
 * Mapped to HTTP 404 by {@link GlobalExceptionHandler}.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
