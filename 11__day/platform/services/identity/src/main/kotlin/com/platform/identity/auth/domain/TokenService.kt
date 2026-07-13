package com.platform.identity.auth.domain

import com.platform.identity.user.domain.User
import java.time.Instant
import java.util.UUID

interface TokenService {
    fun generateAccessToken(user: User): String
    fun generateRefreshToken(user: User): String
    fun parseRefreshToken(token: String): RefreshTokenClaims?
}

data class RefreshTokenClaims(
    val tokenId: UUID,
    val userId: UUID,
    val expiresAt: Instant
)
