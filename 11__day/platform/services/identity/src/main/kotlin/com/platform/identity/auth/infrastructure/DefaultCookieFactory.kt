package com.platform.identity.auth.infrastructure

import com.platform.identity.auth.api.CookieFactory
import org.springframework.http.ResponseCookie
import org.springframework.stereotype.Component

@Component
class DefaultCookieFactory(
    private val jwtProperties: SecurityJwtProperties
) : CookieFactory {

    override fun accessToken(token: String): ResponseCookie {
        return ResponseCookie.from("access_token", token)
            .httpOnly(true)
            .secure(true)
            .sameSite("Lax")
            .path("/")
            .maxAge(jwtProperties.accessTokenExpiration.seconds)
            .build()
    }

    override fun refreshToken(token: String): ResponseCookie {
        return ResponseCookie.from("refresh_token", token)
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/auth")
            .maxAge(jwtProperties.refreshTokenExpiration.seconds)
            .build()
    }
}
