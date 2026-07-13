package com.platform.identity.auth.domain

import com.platform.identity.user.domain.User

interface RefreshTokenService {
    fun generate(user: User): String
    fun parse(token: String): RefreshTokenClaims?
}
