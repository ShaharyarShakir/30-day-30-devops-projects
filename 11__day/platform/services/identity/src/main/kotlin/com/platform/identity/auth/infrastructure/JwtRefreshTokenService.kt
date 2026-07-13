package com.platform.identity.auth.infrastructure

import com.platform.identity.auth.domain.JwtProvider
import com.platform.identity.auth.domain.RefreshTokenClaims
import com.platform.identity.auth.domain.RefreshTokenService
import com.platform.identity.user.domain.User
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class JwtRefreshTokenService(
    private val jwtProvider: JwtProvider
) : RefreshTokenService {
    override fun generate(user: User): String {
        return jwtProvider.generateRefreshToken(user, UUID.randomUUID())
    }

    override fun parse(token: String): RefreshTokenClaims? {
        return jwtProvider.verifyRefreshToken(token)
    }
}
