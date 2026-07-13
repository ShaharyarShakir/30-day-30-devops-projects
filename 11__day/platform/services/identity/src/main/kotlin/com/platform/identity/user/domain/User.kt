package com.platform.identity.user.domain

import java.time.Instant
import java.util.UUID

data class User(
    val id: UUID,
    val email: String,
    val passwordHash: String,
    val status: UserStatus,
    val createdAt: Instant,
    val updatedAt: Instant
)
