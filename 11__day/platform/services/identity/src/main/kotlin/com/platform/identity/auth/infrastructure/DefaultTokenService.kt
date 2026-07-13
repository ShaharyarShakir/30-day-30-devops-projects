package com.platform.identity.auth.infrastructure

import com.platform.identity.auth.domain.AccessTokenService
import com.platform.identity.auth.domain.RefreshTokenClaims
import com.platform.identity.auth.domain.RefreshTokenService
import com.platform.identity.auth.domain.TokenService
import com.platform.identity.user.domain.User
import org.springframework.stereotype.Service

@Service
class DefaultTokenService(
    private val accessTokenService: AccessTokenService,
    private val refreshTokenService: RefreshTokenService
) : TokenService {

    override fun generateAccessToken(user: User): String {
        return accessTokenService.generate(user).value
    }

    override fun generateRefreshToken(user: User): String {
        return refreshTokenService.generate(user)
    }

    override fun parseRefreshToken(token: String): RefreshTokenClaims? {
        return refreshTokenService.parse(token)
    }
}
