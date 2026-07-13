package com.platform.identity.auth.domain

import com.platform.identity.user.domain.User
import java.util.UUID

interface JwtProvider {
    fun generate(user: User): AccessToken
    fun verify(token: String): JwtPrincipal
    fun generateRefreshToken(user: User, tokenId: UUID): String
    fun verifyRefreshToken(token: String): RefreshTokenClaims?
}
