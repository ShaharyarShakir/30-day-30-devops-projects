package com.platform.identity.auth.infrastructure

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "refresh_tokens")
class RefreshTokenEntity(
    @Id
    val id: UUID,

    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Column(nullable = false, unique = true)
    val token: String, // token contains SHA-256 hash of the refresh token

    @Column(name = "expires_at", nullable = false)
    val expiresAt: Instant,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant
)
