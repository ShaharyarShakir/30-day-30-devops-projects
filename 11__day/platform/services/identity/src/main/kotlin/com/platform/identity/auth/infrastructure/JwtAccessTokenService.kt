package com.platform.identity.auth.infrastructure

import com.platform.identity.auth.domain.AccessToken
import com.platform.identity.auth.domain.AccessTokenService
import com.platform.identity.auth.domain.JwtProvider
import com.platform.identity.user.domain.User
import org.springframework.stereotype.Service

@Service
class JwtAccessTokenService(
    private val jwtProvider: JwtProvider
) : AccessTokenService {
    override fun generate(user: User): AccessToken {
        return jwtProvider.generate(user)
    }
}
