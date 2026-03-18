package com.ram.netline_reader_backend.controller;

import com.ram.netline_reader_backend.dto.UserResponseDTO;
import com.ram.netline_reader_backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Resolves the authenticated Keycloak user to their DB record.
 *
 * GET /api/me — returns the current user's profile.
 * If the Keycloak user has no DB record yet, one is auto-provisioned
 * using claims from the JWT (preferred_username, given_name, family_name, realm roles).
 */
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<UserResponseDTO> me(@AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getSubject();
        return ResponseEntity.ok(userService.resolveFromKeycloak(keycloakId, jwt.getClaims()));
    }
}
